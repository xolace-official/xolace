// @vitest-environment edge-runtime
/**
 * `generateMirror` end to end (design: issue #251) — the five outcomes the
 * action can reach: rate-limited, moderation reject, escalation, provider
 * fallback, and the happy path.
 *
 * What is real here matters as much as what is not. `buildSessionContext`,
 * `evaluateSafeguard`, `decideMirrorOutcome`, the prompt builders and every
 * mutation the action calls run for real against a seeded backend. Faked are
 * the Convex components the test backend cannot register (`action-cache`,
 * `rate-limiter`, `rag`, `revenuecat`, posthog, aggregate) and the Anthropic
 * network client — a branch is steered by the value a provider "returned",
 * never by a `fetch` stub.
 *
 * Scheduled work is asserted at the enqueue boundary: `_scheduled_functions`
 * says what was queued with which arguments. The three callees are stubbed to
 * no-ops because `convex-test` schedules on a real `setTimeout` and would
 * otherwise run them — `ai/tts:generateMirrorAudio` would reach ElevenLabs for
 * real the moment that key is present in the environment, and a job firing
 * after its test body would read the next test's stub state.
 * `reflectionDistiller.distill` is executed for real in its own file
 * (`reflectionDistiller.test.ts`), which is why it cannot also be real here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  classificationResult,
  moderationResult,
  scheduled,
  scheduledCalls,
  seedMetadata,
  seedSession,
} from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import {
  actionCacheMock,
  aggregatesMock,
  anthropicMock,
  noopJob,
  posthogMock,
  rateLimiterMock,
  ragMock,
  revenuecatMock,
} from "./mocks.helpers";

const MIRROR = "The deadline is not the weight. Being unseen while carrying it is.";
const FALLBACK_MIRROR = "I hear you, and what you're feeling matters.";
const RAW_TEXT = "another week of shipping and nobody said anything";

/**
 * `vi.mock` factories are hoisted above every `it`, so the per-branch values
 * live in one holder the factories read at call time. Reset in `beforeEach`
 * to the unremarkable happy-path defaults; each test names only what it bends.
 */
const stub = vi.hoisted(() => ({
  cache: {} as { moderation?: unknown; classification?: unknown },
  limit: { ok: true } as { ok: boolean; retryAfter?: number },
  articulator: "" as string | Error,
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
// Free tier throughout — the premium seam (audio tags, wider limits) has no
// branch of its own in `generateMirror` and is covered where it is decided.
vi.mock("../revenuecat", () => revenuecatMock(false));
// One episodic memory in the namespace. Only reached by the non-first-session
// test below: `generateMirror` short-circuits recall entirely on a cold start.
vi.mock("../rag", () =>
  ragMock({
    entries: [
      { entryId: "entry_1", key: "past-session-1", text: "Same week, last month." },
    ],
    results: [{ entryId: "entry_1", score: 0.42 }],
  }),
);
vi.mock("../ai/cached", () => actionCacheMock(() => stub.cache));
vi.mock("../lib/rateLimits", async (orig) => ({
  ...(await orig<typeof import("../lib/rateLimits")>()),
  ...rateLimiterMock(() => stub.limit),
}));
vi.mock("../ai/providers/anthropic", async (orig) => ({
  ...(await orig<typeof import("../ai/providers/anthropic")>()),
  ...anthropicMock(() => stub.articulator),
}));
// Scheduled callees. `scheduleMirrorAudio` stays real — it owns the fallback
// skip this file asserts; only the action it enqueues is neutered.
vi.mock("../ai/tts", async (orig) => ({
  ...(await orig<typeof import("../ai/tts")>()),
  generateMirrorAudio: noopJob(),
}));
vi.mock("../episodicMemory", async (orig) => ({
  ...(await orig<typeof import("../episodicMemory")>()),
  ingestSession: noopJob(),
}));
vi.mock("../jobs/reflectionDistiller", () => ({ distill: noopJob() }));

beforeEach(() => {
  stub.cache = {
    moderation: moderationResult(),
    classification: classificationResult(),
  };
  stub.limit = { ok: true };
  stub.articulator = MIRROR;
});

const readSession = (user: SeededUser, sessionId: Id<"sessions">) =>
  user.root.run((ctx) => ctx.db.get("sessions", sessionId));

const readMetadata = (user: SeededUser, sessionId: Id<"sessions">) =>
  user.root.run((ctx) =>
    ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique(),
  );

/** A processing session for a fresh user, plus the action's own arguments. */
async function seedPipeline(): Promise<{
  user: SeededUser;
  sessionId: Id<"sessions">;
}> {
  const user = await asNewUser();
  const sessionId = await seedSession(user.root, user.profileId, {
    rawInput: RAW_TEXT,
  });
  return { user, sessionId };
}

const run = (user: SeededUser, sessionId: Id<"sessions">) =>
  user.root.action(internal.ai.process.generateMirror, {
    sessionId,
    rawText: RAW_TEXT,
  });

describe("generateMirror", () => {
  it("fails the session with a retry hint when rate limited", async () => {
    const { user, sessionId } = await seedPipeline();
    stub.limit = { ok: false, retryAfter: 120_000 };

    await run(user, sessionId);

    const session = await readSession(user, sessionId);
    expect(session?.state).toBe("error");
    expect(session?.errorMessage).toContain("Try again in 2 minutes.");
    // Bailed before the model: nothing classified, nothing queued.
    expect(await readMetadata(user, sessionId)).toBeNull();
    expect(await scheduledCalls(user.root)).toHaveLength(0);
  });

  it("rejects content the moderation verdict disallows", async () => {
    const { user, sessionId } = await seedPipeline();
    stub.cache.moderation = moderationResult({
      flagged: true,
      categories: { "hate/threatening": true },
      categoryScores: { "hate/threatening": 0.94 },
    });

    await run(user, sessionId);

    const session = await readSession(user, sessionId);
    expect(session?.state).toBe("error");
    expect(session?.errorMessage).toBe("content_policy_violation");
    expect(session?.mirrorText).toBeUndefined();
    // Rejection is terminal — no metadata row, no downstream work.
    expect(await readMetadata(user, sessionId)).toBeNull();
    expect(await scheduledCalls(user.root)).toHaveLength(0);
  });

  it("escalates a crisis verdict and still delivers a mirror", async () => {
    const { user, sessionId } = await seedPipeline();
    stub.cache.moderation = moderationResult({
      flagged: true,
      categories: { "self-harm": true, "self-harm/intent": true },
      categoryScores: { "self-harm": 0.88, "self-harm/intent": 0.81 },
    });

    await run(user, sessionId);

    const session = await readSession(user, sessionId);
    expect(session?.state).toBe("mirror_delivered");
    expect(session?.mirrorText).toBe(MIRROR);
    expect(session?.safeguardLevel).toBe("crisis");
    expect(session?.escalationTriggered).toBe(true);
    // Escalation forces the follow-up flag regardless of what the model said.
    expect(session?.requiresFollowUp).toBe(true);
    expect(session?.escalationResources?.length).toBeGreaterThan(0);

    const [event] = await user.root.run((ctx) =>
      ctx.db
        .query("escalation_events")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .collect(),
    );
    expect(event).toMatchObject({
      triggerType: "explicit_crisis_language",
      actionTaken: "crisis_line_presented",
      reviewedByHuman: false,
    });
    expect(event.triggerConfidence).toBeCloseTo(0.81);

    const metadata = await readMetadata(user, sessionId);
    expect(metadata).toMatchObject({ riskFlag: true, safeguardLevel: "crisis" });

    // A crisis session is excluded from the reflection pool, but memory
    // ingestion still runs (it handles crisis metadata-only itself).
    const calls = await scheduledCalls(user.root);
    expect(scheduled(calls, "jobs/reflectionDistiller:distill")).toBeUndefined();
    expect(scheduled(calls, "episodicMemory:ingestSession")).toBeDefined();
  });

  it("fails the session with sanitized copy when a provider outage escapes", async () => {
    const { user, sessionId } = await seedPipeline();
    // The classifier has no in-pipeline fallback, so its failure reaches the
    // outer catch — the only path through `sanitizeAiError`.
    stub.cache.classification = new Error("529 overloaded_error");

    await run(user, sessionId);

    const session = await readSession(user, sessionId);
    expect(session?.state).toBe("error");
    expect(session?.errorMessage).toBe(
      "The space is a little full right now. Take a breath and try again in a moment.",
    );
    expect(await scheduledCalls(user.root)).toHaveLength(0);
  });

  it("falls back to the safe mirror when the articulator call fails", async () => {
    const { user, sessionId } = await seedPipeline();
    stub.articulator = new Error("529 overloaded_error");

    await run(user, sessionId);

    const session = await readSession(user, sessionId);
    // The provider failing degrades the mirror; it never fails the session.
    expect(session?.state).toBe("mirror_delivered");
    expect(session?.mirrorText).toBe(FALLBACK_MIRROR);
    // Classification survives the articulation failure.
    expect(await readMetadata(user, sessionId)).toMatchObject({
      primaryEmotion: "anxiety",
    });

    // A fallback names no gap and has nothing to distill or speak.
    expect(session?.gapNamed).toBeUndefined();
    const calls = await scheduledCalls(user.root);
    expect(scheduled(calls, "jobs/reflectionDistiller:distill")).toBeUndefined();
    expect(scheduled(calls, "ai/tts:generateMirrorAudio")).toBeUndefined();
    expect(scheduled(calls, "episodicMemory:ingestSession")).toBeDefined();
  });

  it("delivers the mirror, stores metadata and queues the downstream chain", async () => {
    const { user, sessionId } = await seedPipeline();
    // Not a cold start. `sessionCount` is what `isFirstSession` reads, and
    // seeding rows alone leaves it at 0 — which would keep the pattern
    // summaries on their first-session branch and skip episodic recall
    // outright, quietly making the assertions below vacuous.
    const priorSession = await seedSession(user.root, user.profileId, {
      state: "completed",
      mirrorText: "Last week's version of this.",
    });
    await seedMetadata(user.root, priorSession, user.profileId);
    await user.root.run((ctx) =>
      ctx.db.patch("emotional_profiles", user.profileId, { sessionCount: 1 }),
    );

    await run(user, sessionId);

    const session = await readSession(user, sessionId);
    expect(session?.state).toBe("mirror_delivered");
    expect(session?.mirrorText).toBe(MIRROR);
    expect(session?.toneUsed).toBe("adaptive");
    expect(session?.safeguardLevel).toBe("none");
    expect(session?.escalationTriggered).toBeUndefined();
    expect(session?.errorMessage).toBeUndefined();

    expect(await readMetadata(user, sessionId)).toMatchObject({
      primaryEmotion: "anxiety",
      intensity: 5,
      specificity: 7,
      thematicTags: ["work"],
      riskFlag: false,
      safeguardLevel: "none",
      // Episodic recall really ran: the key is provenance for Understanding,
      // the score is what the claim-strength router reads.
      episodicMatchKeys: ["past-session-1"],
      episodicTopScore: 0.42,
    });

    const calls = await scheduledCalls(user.root);
    expect(scheduled(calls, "ai/tts:generateMirrorAudio")?.args).toMatchObject({
      sessionId,
      mirrorText: MIRROR,
      mirrorTone: "adaptive",
    });
    expect(scheduled(calls, "jobs/reflectionDistiller:distill")?.args).toMatchObject({
      sessionId,
      rawText: RAW_TEXT,
      mirrorText: MIRROR,
      primaryEmotion: "anxiety",
      thematicTags: ["work"],
    });
    expect(scheduled(calls, "episodicMemory:ingestSession")?.args).toMatchObject({
      sessionId,
    });
  });
});
