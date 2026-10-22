// @vitest-environment edge-runtime
/**
 * The storage seam of compounding (#519, ADR 0020): readings landing through
 * the real mutations → stretch rows → compoundingFor. The rules themselves are
 * in detect.test.ts; the source scans (wipe parity, no safeguard cross-feed)
 * in lib/sessionCascade.test.ts.
 *
 * Failure modes, written before the code:
 *  1. Two open stretches for one domain: a re-run evaluation, or two readings
 *     landing at once. Convex runs mutations serializably and the evaluation
 *     reads the domain's rows in the same transaction as it writes, so the
 *     later one retries and sees the first's row; what's left to prove is
 *     that a second evaluation never adds one.
 *  2. A mood check or follow-up answer opens a stretch (only session
 *     readings may), or can't close one (any reading may).
 *  3. A quiet stretch's end is never written, or is dated at the evaluation
 *     instead of 30 days after the last reading; readers show it as live
 *     until something writes it.
 *  4. Returning measured from the wrong row or the wrong moment.
 *  5. A knob or classifier change rewrites history: a closed row is touched,
 *     or an open row's anchor is recomputed.
 *  6. Retention deletes an open stretch, or keeps a closed one past cutoff;
 *     a wipe or account deletion leaves a row.
 *  7. Cross-feed with safeguard: a crisis session dropped as a reading, or
 *     its safeguard state changed.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { classificationArgs, runEvaluations } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, noopJob, posthogMock, revenuecatMock } from "../test/mocks.helpers";
import { compoundingFor, evaluateCompounding } from "./stretches";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../jobs/profileStats", () => ({ updateAfterSession: noopJob() }));
vi.mock("../ai/reflectionAgent/trigger", () => ({ onSessionComplete: noopJob() }));
vi.mock("../ai/paths/generate", () => ({ run: noopJob() }));

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

type Seed = { daysAgo: number; intensity: number; tags?: string[]; session?: Partial<Doc<"sessions">> };

async function seed(user: SeededUser, seeds: Seed[]): Promise<Id<"sessions">[]> {
  return await user.root.run(async (ctx) => {
    const ids = [];
    for (const s of seeds) {
      const at = NOW - s.daysAgo * DAY;
      const sessionId = await ctx.db.insert("sessions", {
        emotionalProfileId: user.profileId,
        state: "completed",
        confirmationState: "confirmed",
        entryType: "open_prompt",
        kept: true,
        createdAt: at,
        updatedAt: at,
        ...s.session,
      });
      await ctx.db.insert("emotional_metadata", {
        ...classificationArgs({ sessionId, emotionalProfileId: user.profileId }),
        intensity: s.intensity,
        thematicTags: s.tags ?? ["work"],
        createdAt: at,
      });
      ids.push(sessionId);
    }
    return ids;
  });
}

/** A settled usual (intensity 4 ≈ 67) every other day, `from` → `from` − 98 days. */
const usual = (from = 120, tags?: string[], intensity = 4): Seed[] =>
  Array.from({ length: 50 }, (_, i) => ({ daysAgo: from - i * 2, intensity, tags }));

/** A heavy run, one session a day, ending `endDaysAgo`. */
const heavy = (days: number, endDaysAgo = 1.5, tags?: string[]): Seed[] =>
  Array.from({ length: days }, (_, i) => ({ daysAgo: endDaysAgo + i, intensity: 10, tags }));

/** Tonight's session, confirmed and waiting for the Exit tap. */
const tonight = (o: Partial<Seed> = {}): Seed => ({
  daysAgo: 0.05,
  intensity: 10,
  ...o,
  session: { state: "confirmed", ...o.session },
});

const rows = (user: SeededUser) =>
  user.root.run((ctx) =>
    ctx.db
      .query("compounding_stretches")
      .withIndex("by_emotionalProfileId_and_endedAt", (q) => q.eq("emotionalProfileId", user.profileId))
      .collect(),
  );

const insertRow = (user: SeededUser, row: Partial<Doc<"compounding_stretches">>) =>
  user.root.run((ctx) =>
    ctx.db.insert("compounding_stretches", {
      emotionalProfileId: user.profileId,
      domain: "work",
      startedAt: NOW - 10 * DAY,
      anchorBaseline: 67,
      ...row,
    }),
  );

async function exit(user: SeededUser, sessionId: Id<"sessions">) {
  await user.t.mutation(api.sessions.completeSession, { sessionId });
  await runEvaluations(user.root);
}

const read = (user: SeededUser) => user.root.run((ctx) => compoundingFor(ctx, user.profileId));

describe("evaluateCompounding at session completion", () => {
  it("opens one stretch, anchored at the live baseline; a re-run adds none (1)", async () => {
    const user = await asNewUser();
    const ids = await seed(user, [...usual(), ...heavy(7), tonight()]);
    await exit(user, ids.at(-1)!);

    const [row] = await rows(user);
    expect(row).toMatchObject({ domain: "work", startedAt: NOW });
    expect(row.endedAt).toBeUndefined();
    expect(row.anchorBaseline).toBeGreaterThan(50);
    expect(row.anchorBaseline).toBeLessThan(67);

    await user.root.run((ctx) => evaluateCompounding(ctx, user.profileId, { sessionId: ids.at(-1)! }));
    expect(await rows(user)).toHaveLength(1);
  });

  it("never opens from a mood check or follow-up answer (2)", async () => {
    const user = await asNewUser();
    const ids = await seed(user, [...usual(), ...heavy(7), tonight({ session: { state: "completed" } })]);
    const sessionId = ids.at(-1)!;
    await user.t.mutation(api.sessions.recordPostSessionFeedback, { sessionId, postSessionMood: "heavier" });
    const cardId = await user.root.run((ctx) =>
      ctx.db.insert("follow_up_cards", {
        emotionalProfileId: user.profileId,
        sessionId: ids.at(-2)!,
        workflowId: "wf1" as WorkflowId,
        tier: "standard",
        cardText: "How's it sitting now?",
        escalationDerived: false,
        status: "shown",
        createdAt: NOW - DAY,
      }),
    );
    await user.t.mutation(api.followUps.resolveCard, { cardId, response: "heavier" });
    await runEvaluations(user.root);
    expect(await rows(user)).toHaveLength(0);

    // The signal was there all along: only the session reading may open.
    await user.root.run((ctx) => evaluateCompounding(ctx, user.profileId, { sessionId }));
    expect(await rows(user)).toHaveLength(1);
  });

  it("lets a mood check close one back near the usual, dated now (2)", async () => {
    const user = await asNewUser();
    const ids = await seed(user, [...usual(), tonight({ intensity: 4, session: { state: "completed" } })]);
    await insertRow(user, { anchorBaseline: 70 });
    await user.t.mutation(api.sessions.recordPostSessionFeedback, {
      sessionId: ids.at(-1)!,
      postSessionMood: "same",
    });
    await runEvaluations(user.root);
    expect(await rows(user)).toMatchObject([{ endedAt: NOW }]);
  });

  it("writes a quiet stretch's end at 30 days, and the next one is returning (3, 4)", async () => {
    const user = await asNewUser();
    const startedAt = NOW - 44.9 * DAY;
    const ids = await seed(user, [...usual(150), ...heavy(8, 45), ...heavy(7), tonight()]);
    await insertRow(user, { startedAt, anchorBaseline: 67 });
    await exit(user, ids.at(-1)!);

    const [old, next] = (await rows(user)).sort((a, b) => a.startedAt - b.startedAt);
    // 30 days after the reading that tipped it in, not after the row was written.
    expect(old.endedAt).toBe(NOW - 45 * DAY + 30 * DAY);
    expect(next.startedAt).toBe(NOW);
    expect(next.endedAt).toBeUndefined();
    expect(await read(user)).toMatchObject([{ domain: "work", returning: true, stretchId: `work:${NOW}` }]);
  });

  it("never rewrites a closed stretch, and an old one doesn't make the next returning (4, 5)", async () => {
    const user = await asNewUser();
    const march = {
      startedAt: NOW - 200 * DAY,
      endedAt: NOW - 170 * DAY,
      anchorBaseline: 5,
      followUpStartedAt: NOW - 199 * DAY,
    };
    const closedId = await insertRow(user, march);
    const ids = await seed(user, [...usual(), ...heavy(7), tonight()]);
    await exit(user, ids.at(-1)!);

    const closed = await user.root.run((ctx) => ctx.db.get("compounding_stretches", closedId));
    expect(closed).toMatchObject(march);
    expect(await read(user)).toMatchObject([{ returning: false }]);
  });

  it("judges an open stretch against its stored anchor, never recomputing it (5)", async () => {
    const user = await asNewUser();
    // Live baseline ≈ 67 and steadiness ≈ 67: no gap live, a wide one against the anchor.
    const ids = await seed(user, [...usual(), tonight({ intensity: 4, session: { state: "completed" } })]);
    await insertRow(user, { anchorBaseline: 95 });
    await user.t.mutation(api.sessions.recordPostSessionFeedback, {
      sessionId: ids.at(-1)!,
      postSessionMood: "same",
    });
    await runEvaluations(user.root);
    const [row] = await rows(user);
    expect(row.anchorBaseline).toBe(95);
    expect(row.endedAt).toBeUndefined();
    expect(await read(user)).toMatchObject([{ domain: "work" }]);
  });

  it("counts a crisis session and leaves its safeguard state alone (7)", async () => {
    const user = await asNewUser();
    const ids = await seed(user, [...usual(), ...heavy(7), tonight({ session: { safeguardLevel: "crisis" } })]);
    await exit(user, ids.at(-1)!);

    expect(await rows(user)).toHaveLength(1);
    const session = await user.root.run((ctx) => ctx.db.get("sessions", ids.at(-1)!));
    expect(session?.safeguardLevel).toBe("crisis");
  });
});

describe("compoundingFor", () => {
  it("ranks by gap and links domains that came up together", async () => {
    const user = await asNewUser();
    const both = ["work", "family"];
    const ids = await seed(user, [
      ...usual(120, ["work"], 1), // work's usual is steadier, so its gap is wider
      ...usual(119, ["family"]),
      ...heavy(7, 1.5, both),
      tonight({ tags: both }),
    ]);
    await exit(user, ids.at(-1)!);

    const out = await read(user);
    expect(out.map((c) => c.domain)).toEqual(["work", "family"]);
    expect(out[0].gap).toBeGreaterThan(out[1].gap);
    expect(out[0]).toMatchObject({
      state: "compounding",
      returning: false,
      startedAt: NOW,
      coDomains: [{ domain: "family", firstBelowAt: NOW }],
    });
    expect(out[0].band).toBeGreaterThanOrEqual(10);
    expect(out[0].shareTrend).toBeGreaterThan(0);
  });

  it("reads a stretch quiet for 30 days as ended before anything writes it (3)", async () => {
    const user = await asNewUser();
    const ids = await seed(user, [...usual(), ...heavy(7), tonight()]);
    await exit(user, ids.at(-1)!);
    vi.setSystemTime(NOW + 31 * DAY);

    expect(await read(user)).toEqual([]);
    expect((await rows(user)).map((r) => r.endedAt)).toEqual([undefined]);
  });
});

describe("retention, wipe and account deletion (6)", () => {
  it("retention drops closed stretches past cutoff and never an open one", async () => {
    const user = await asNewUser();
    await user.root.run(async (ctx) => {
      const prefs = await ctx.db
        .query("preferences")
        .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
        .unique();
      await ctx.db.patch("preferences", prefs!._id, { dataRetentionPreference: "6_months" });
    });
    await insertRow(user, { domain: "work", startedAt: NOW - 300 * DAY, endedAt: NOW - 200 * DAY });
    await insertRow(user, { domain: "family", startedAt: NOW - 300 * DAY });
    await insertRow(user, { domain: "self", startedAt: NOW - 40 * DAY, endedAt: NOW - 10 * DAY });

    await user.root.mutation(internal.jobs.dataRetention.enforce, { tier: "6_months" });
    expect((await rows(user)).map((r) => r.domain).sort()).toEqual(["family", "self"]);
  });

  it("a wipe drops every row", async () => {
    const user = await asNewUser();
    await insertRow(user, {});
    await insertRow(user, { domain: "family", endedAt: NOW - DAY });
    await user.root.mutation(internal.jobs.dataWipe.wipe, { emotionalProfileId: user.profileId });
    expect(await rows(user)).toEqual([]);
  });

  it("account deletion drops every row", async () => {
    const user = await asNewUser();
    await insertRow(user, {});
    await insertRow(user, { domain: "family", endedAt: NOW - DAY });
    // Imported here: a static import pulls lib/aggregates in ahead of the hoisted vi.mock.
    const { drainStretches } = await import("../jobs/accountDeletionSteps");
    await user.root.run((ctx) => drainStretches(ctx, user.profileId));
    expect(await rows(user)).toEqual([]);
  });
});
