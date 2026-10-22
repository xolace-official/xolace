// @vitest-environment edge-runtime
/**
 * The compounding follow-up trigger (#522, #492 §3–4), driven through the real
 * completeSession → startFollowUpWorkflow → createAndStart path.
 *
 * Failure modes: easing, an untouched domain, or a free user firing it; a
 * second session in the same stretch re-firing it; an elevated, crisis or
 * burned session (or a supersede-blocked start) spending it; a compounding-
 * only follow-up above standard; the domain reaching the lock screen; and any
 * change to an ordinary follow-up.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { compoundingFor } from "../compounding/stretches";
import { runEvaluations, scheduled, scheduledCalls, seedMetadata, seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock, anthropicMock, noopJob, posthogMock, ragMock, revenuecatMock } from "./mocks.helpers";

const stub = vi.hoisted(() => ({ isPlus: true, prompts: [] as string[] }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../revenuecat", () => revenuecatMock(() => stub.isPlus));
vi.mock("../ai/providers/anthropic", async (orig) => {
  const mock = anthropicMock("Work and studies has been a lot lately. How is it sitting?");
  return {
    ...(await orig<typeof import("../ai/providers/anthropic")>()),
    getAnthropicClient: () => ({
      messages: {
        create: async (req: { messages: { content: string }[] }) => {
          stub.prompts.push(req.messages[0].content);
          return mock.getAnthropicClient().messages.create();
        },
      },
    }),
  };
});
// The workflow's own sleeps aren't under test, and its body deletes
// globalThis.process when convex-test runs it inline. Only start/cancel faked.
vi.mock("@convex-dev/workflow", async (orig) => {
  const real = await orig<typeof import("@convex-dev/workflow")>();
  let n = 0;
  class WorkflowManager extends real.WorkflowManager {
    start = async () => `wf_${++n}` as never;
    cancel = async () => {};
  }
  return { ...real, WorkflowManager };
});
vi.mock("../jobs/profileStats", () => ({ updateAfterSession: noopJob() }));
vi.mock("../ai/reflectionAgent/trigger", () => ({ onSessionComplete: noopJob() }));

beforeEach(() => {
  stub.isPlus = true;
  stub.prompts = [];
});

const DAY = 86_400_000;

async function seedReading(user: SeededUser, daysAgo: number, tags: string[], intensity: number) {
  const sessionId = await seedSession(user.root, user.profileId, {
    state: "completed",
    confirmationState: "confirmed",
    createdAt: Date.now() - daysAgo * DAY,
  });
  await seedMetadata(user.root, sessionId, user.profileId, { intensity, thematicTags: tags });
}

/** A settled work usual (intensity 4) and a heavy last week. */
async function heavyWork(user: SeededUser) {
  for (let i = 0; i < 50; i++) await seedReading(user, 120 - i * 2, ["work"], 4);
  for (let d = 1; d <= 7; d++) await seedReading(user, d + 0.5, ["work"], 10);
}

/** heavyWork, and its open stretch. */
async function compoundingWork(user: SeededUser) {
  await heavyWork(user);
  await user.root.run((ctx) =>
    ctx.db.insert("compounding_stretches", {
      emotionalProfileId: user.profileId,
      domain: "work",
      startedAt: Date.now() - 20 * DAY,
      anchorBaseline: 67,
    }),
  );
}

type Tonight = Partial<Pick<Doc<"sessions">, "kept" | "requiresFollowUp">> & {
  safeguardLevel?: Doc<"emotional_metadata">["safeguardLevel"];
  intensity?: number;
  primaryEmotion?: string;
};

/** Complete tonight's session for real, then run the follow-up start it scheduled. */
async function tonight(user: SeededUser, tags: string[], over: Tonight = {}) {
  const sessionId = await seedSession(user.root, user.profileId, {
    state: "confirmed",
    kept: over.kept ?? true,
    ...(over.requiresFollowUp ? { requiresFollowUp: true } : {}),
    ...(over.safeguardLevel ? { safeguardLevel: over.safeguardLevel } : {}),
  });
  await seedMetadata(user.root, sessionId, user.profileId, {
    intensity: over.intensity ?? 10,
    thematicTags: tags,
    ...(over.primaryEmotion ? { primaryEmotion: over.primaryEmotion } : {}),
    ...(over.safeguardLevel ? { safeguardLevel: over.safeguardLevel } : {}),
  });
  await user.t.mutation(api.sessions.completeSession, { sessionId });
  await runEvaluations(user.root);
  if (scheduled(await scheduledCalls(user.root), "followUps:startFollowUpWorkflow")) {
    await user.root.action(internal.followUps.startFollowUpWorkflow, { sessionId });
  }
  return await user.root.run(async (ctx) => {
    const card = await ctx.db
      .query("follow_up_cards")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    return card;
  });
}

const workStretch = (user: SeededUser) =>
  user.root.run((ctx) =>
    ctx.db
      .query("compounding_stretches")
      .withIndex("by_emotionalProfileId_and_domain_and_startedAt", (q) =>
        q.eq("emotionalProfileId", user.profileId).eq("domain", "work"),
      )
      .first(),
  );

describe("the compounding follow-up trigger (#522)", () => {
  it("earns a standard check-in naming the domain, and spends the stretch", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    const card = await tonight(user, ["work"]);
    expect(card).toMatchObject({ tier: "standard", compoundingDomain: "work", status: "pending" });
    expect(stub.prompts.at(-1)).toContain("across recent sessions, not just this one: work and studies");
    expect((await workStretch(user))?.followUpStartedAt).toBeTypeOf("number");
  });

  it("fires on the session whose reading opens the stretch, starting only once it's open (#529)", async () => {
    const user = await asNewUser();
    await heavyWork(user);
    const sessionId = await seedSession(user.root, user.profileId, { state: "confirmed", kept: true });
    await seedMetadata(user.root, sessionId, user.profileId, { intensity: 10, thematicTags: ["work"] });
    await user.t.mutation(api.sessions.completeSession, { sessionId });
    // Nothing compounding ran in the completion, and the start waits on it.
    expect(await workStretch(user)).toBeNull();
    const calls = await scheduledCalls(user.root);
    expect(scheduled(calls, "followUps:startFollowUpWorkflow")).toBeUndefined();
    expect(scheduled(calls, "compounding/stretches:evaluate")?.args).toMatchObject({ sessionId, startFollowUp: true });

    await runEvaluations(user.root);
    expect(scheduled(await scheduledCalls(user.root), "followUps:startFollowUpWorkflow")).toBeDefined();
    await user.root.action(internal.followUps.startFollowUpWorkflow, { sessionId });
    const card = await user.root.run((ctx) =>
      ctx.db.query("follow_up_cards").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).unique(),
    );
    expect(card).toMatchObject({ tier: "standard", compoundingDomain: "work" });
    expect((await workStretch(user))?.followUpStartedAt).toBeTypeOf("number");
  });

  it("never re-fires on a second session in the same stretch", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    expect(await tonight(user, ["work"])).not.toBeNull();
    expect(await tonight(user, ["studies"])).toBeNull();
  });

  /** Start a follow-up for a fresh session, as if getStartContext had picked work before a sibling spent it. */
  async function lateStart(user: SeededUser, over: Partial<Doc<"sessions">> = {}) {
    const stretch = await workStretch(user);
    await tonight(user, ["work"]);
    const sessionId = await seedSession(user.root, user.profileId, { state: "completed", ...over });
    await user.root.run(async (ctx) => {
      // The sibling's card is retired so supersede doesn't decide this.
      for (const c of await ctx.db.query("follow_up_cards").take(10)) {
        await ctx.db.patch("follow_up_cards", c._id, { status: "expired" });
      }
    });
    await user.root.mutation(internal.followUps.createAndStart, {
      sessionId,
      emotionalProfileId: user.profileId,
      cardText: "Work and studies has been a lot lately.",
      escalationDerived: false,
      signals: { safeguardLevel: null, intensity: 10, primaryEmotion: null, granularLabel: null, confirmationState: null },
      compounding: { domain: "work", stretchStartedAt: stretch!.startedAt },
    });
    return await user.root.run((ctx) =>
      ctx.db.query("follow_up_cards").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).unique(),
    );
  }

  it("stands down when a sibling session spent the stretch after it looked", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    expect(await lateStart(user)).toBeNull();
  });

  it("drops the framing from an ordinary follow-up that lost the stretch to a sibling", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    const card = await lateStart(user, { requiresFollowUp: true });
    expect(card?.compoundingDomain).toBeUndefined();
    expect(card?.cardText).not.toMatch(/work/i);
  });

  it("keeps an ordinary follow-up's own tier on a compounding night", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    const card = await tonight(user, ["work"], { requiresFollowUp: true, primaryEmotion: "grief", intensity: 8 });
    expect(card).toMatchObject({ tier: "elevated", compoundingDomain: "work" });
  });

  it("never fires on easing", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    // Two days of lighter readings, above the current ~36 but still well below the usual.
    await seedReading(user, 1.2, ["work"], 5);
    await seedReading(user, 0.1, ["work"], 5);
    const live = await user.root.run((ctx) => compoundingFor(ctx, user.profileId));
    expect(live.find((c) => c.domain === "work")?.state).toBe("easing");
    expect(await tonight(user, ["work"], { intensity: 5 })).toBeNull();
  });

  it("never fires for a domain tonight's session didn't touch", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    expect(await tonight(user, ["family"])).toBeNull();
  });

  it("never fires for a free user", async () => {
    stub.isPlus = false;
    const user = await asNewUser();
    await compoundingWork(user);
    expect(await tonight(user, ["work"])).toBeNull();
  });

  it.each([
    ["elevated", { safeguardLevel: "elevated" as const, requiresFollowUp: true }],
    ["crisis", { safeguardLevel: "crisis" as const, requiresFollowUp: true }],
    ["burned", { kept: false }],
  ])("leaves the trigger unused after a %s session", async (_, over) => {
    const user = await asNewUser();
    await compoundingWork(user);
    const first = await tonight(user, ["work"], over);
    expect(first?.compoundingDomain).toBeUndefined();
    expect((await workStretch(user))?.followUpStartedAt).toBeUndefined();
    // Retire the safety card so the next ordinary session isn't blocked by it.
    if (first) await user.root.run((ctx) => ctx.db.patch("follow_up_cards", first._id, { status: "expired" }));
    expect((await tonight(user, ["work"]))?.compoundingDomain).toBe("work");
  });

  it("leaves the stretch unspent when a heavier card blocks the start", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    await tonight(user, ["family"], { safeguardLevel: "crisis", requiresFollowUp: true });
    expect(await tonight(user, ["work"])).toBeNull();
    expect((await workStretch(user))?.followUpStartedAt).toBeUndefined();
  });

  it("keeps the push generic", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    await user.root.run(async (ctx) => {
      const prefs = await ctx.db
        .query("preferences")
        .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
        .unique();
      await ctx.db.patch("preferences", prefs!._id, {
        notifications: { ...prefs!.notifications, enabled: true, gentleReturn: true },
      });
    });
    const card = await tonight(user, ["work"]);
    await user.root.mutation(internal.followUps.sendFollowUpNudge, { workflowId: card!.workflowId });
    const push = scheduled(await scheduledCalls(user.root), "notifications:schedule");
    expect(push?.args.content).not.toBe(card!.cardText);
    expect(String(push?.args.content)).not.toMatch(/work/i);
  });

  it("leaves an ordinary follow-up as it was for a free user", async () => {
    stub.isPlus = false;
    const user = await asNewUser();
    await compoundingWork(user);
    const card = await tonight(user, ["work"], { requiresFollowUp: true });
    expect(card).toMatchObject({ tier: "standard", status: "pending" });
    expect(card?.compoundingDomain).toBeUndefined();
    expect(stub.prompts.at(-1)).not.toContain("across recent sessions");
  });
});
