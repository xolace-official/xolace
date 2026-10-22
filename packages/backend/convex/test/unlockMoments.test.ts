// @vitest-environment edge-runtime
/**
 * Unlock moments (#523, #490 §5, #513), driven through the real
 * completeSession path.
 *
 * Failure modes: a session that isn't the domain's third distinct day (a
 * second session the same day, the fourth day, settling) stamping an unlock;
 * a session that opens two domains naming only one; "first" when another
 * domain was already open; free users left out; the push naming the domain;
 * the push firing after the beat was seen, with notifications or milestones
 * off, inside the quiet window, or twice in a week; and the push landing
 * anywhere but the next day in the person's usual hour. Retention:
 * unlockRetention.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimiterSchema from "../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { missedPushAt } from "../compounding/unlocks";
import { runEvaluations, scheduledCalls, seedMetadata, seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock, anthropicMock, noopJob, posthogMock, ragMock, revenuecatMock } from "./mocks.helpers";

const stub = vi.hoisted(() => ({ isPlus: false }));
type Sent = { notification: { title?: string; body?: string; data?: unknown } };
const sentPushes = vi.hoisted(() => [] as Sent[]);

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../revenuecat", () => revenuecatMock(() => stub.isPlus));
vi.mock("../ai/providers/anthropic", async (orig) => ({
  ...(await orig<typeof import("../ai/providers/anthropic")>()),
  ...anthropicMock("A check-in."),
}));
vi.mock("../lib/pushNotifications", () => ({
  sendPushToProfile: async (_ctx: unknown, args: Sent) => {
    sentPushes.push(args);
  },
}));
vi.mock("../streamSetup", async (orig) => ({
  ...(await orig<typeof import("../streamSetup")>()),
  addToXolaceChannel: noopJob(),
}));
vi.mock("../jobs/profileStats", () => ({ updateAfterSession: noopJob() }));
vi.mock("../ai/reflectionAgent/trigger", () => ({ onSessionComplete: noopJob() }));
vi.mock("../followUps", async (orig) => ({
  ...(await orig<typeof import("../followUps")>()),
  startFollowUpWorkflow: noopJob(),
}));

beforeEach(() => {
  stub.isPlus = false;
  sentPushes.length = 0;
});

const rateLimiterModules = import.meta.glob(
  "../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts",
);

const DAY = 86_400_000;
const HOUR = 3_600_000;

async function seedReading(user: SeededUser, daysAgo: number, tags: string[]) {
  const sessionId = await seedSession(user.root, user.profileId, {
    state: "completed",
    confirmationState: "confirmed",
    createdAt: Date.now() - daysAgo * DAY,
  });
  await seedMetadata(user.root, sessionId, user.profileId, { intensity: 5, thematicTags: tags });
}

/** Complete tonight's session for real; its unlock stamp, if any. */
async function tonight(user: SeededUser, tags: string[]) {
  const sessionId = await seedSession(user.root, user.profileId, { state: "confirmed" });
  await seedMetadata(user.root, sessionId, user.profileId, { intensity: 5, thematicTags: tags });
  await user.t.mutation(api.sessions.completeSession, { sessionId });
  await runEvaluations(user.root);
  const session = await user.root.run((ctx) => ctx.db.get("sessions", sessionId));
  return { sessionId, unlock: session?.domainUnlock };
}

const pushFor = async (user: SeededUser, sessionId: Id<"sessions">) =>
  (await scheduledCalls(user.root)).filter(
    (f) => f.name.includes("unlocks:sendMissedPush") && f.args.sessionId === sessionId,
  );

const setPrefs = (user: SeededUser, notifications: Partial<Doc<"preferences">["notifications"]>) =>
  user.root.run(async (ctx) => {
    const p = (await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
      .unique())!;
    await ctx.db.patch("preferences", p._id, { notifications: { ...p.notifications, ...notifications } });
  });

/** Work on two distinct days already: tonight's work session is its third. */
async function workWarming(user: SeededUser) {
  await seedReading(user, 2, ["work"]);
  await seedReading(user, 1, ["work"]);
}

describe("the unlock beat (#523)", () => {
  it("stamps the third distinct day as a first unlock, for a free user too, and schedules the push", async () => {
    const user = await asNewUser();
    await workWarming(user);
    const { sessionId, unlock } = await tonight(user, ["work"]);
    expect(unlock).toEqual({ domains: ["work"], first: true });
    expect(await pushFor(user, sessionId)).toHaveLength(1);
  });

  it("stamps nothing on a second session the same day, the fourth day, or settling", async () => {
    const user = await asNewUser();
    await workWarming(user);
    await tonight(user, ["work"]);
    const again = await tonight(user, ["studies"]);
    expect(again.unlock).toBeUndefined();
    expect(await pushFor(user, again.sessionId)).toHaveLength(0);

    // Settling: 5+ days, first reading 21+ days old, already unlocked.
    const settler = await asNewUser(2);
    for (const d of [30, 25, 20, 15]) await seedReading(settler, d, ["family"]);
    expect((await tonight(settler, ["family"])).unlock).toBeUndefined();
  });

  it("names every domain one session opens, and isn't first once another domain was open", async () => {
    const user = await asNewUser();
    for (const d of [5, 4, 3]) await seedReading(user, d, ["family"]);
    await seedReading(user, 2, ["work", "romance"]);
    await seedReading(user, 1, ["work", "romance"]);
    const { unlock } = await tonight(user, ["work", "romance"]);
    expect(unlock?.first).toBe(false);
    expect([...(unlock?.domains ?? [])].sort()).toEqual(["love", "work"]);
  });
});

describe("the missed-unlock push (#523)", () => {
  // Fake timers, so the next-day push and the schedule it enqueues really run.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function notifiable(n = 1, notifications: Partial<Doc<"preferences">["notifications"]> = {}) {
    const user = await asNewUser(n);
    user.root.registerComponent("rateLimiter", rateLimiterSchema, rateLimiterModules);
    await setPrefs(user, { enabled: true, milestone: true, ...notifications });
    await workWarming(user);
    return user;
  }
  const nextDay = (user: SeededUser) => user.root.finishAllScheduledFunctions(vi.runAllTimers);
  const logs = (user: SeededUser) => user.root.run((ctx) => ctx.db.query("notification_log").take(10));

  it("sends generic text that never names the domain, the next day", async () => {
    const user = await notifiable();
    const unlockAt = Date.now();
    await tonight(user, ["work"]);
    await nextDay(user);
    expect(sentPushes).toHaveLength(1);
    const { title, body, data } = sentPushes[0].notification;
    expect({ title, body }).toEqual({
      title: "Something new is ready.",
      body: "Part of your Insights has come into focus.",
    });
    expect(JSON.stringify(sentPushes[0])).not.toMatch(/work/i);
    expect(data).toMatchObject({ type: "domain_unlock" });
    expect(Date.now() - unlockAt).toBeGreaterThanOrEqual(12 * HOUR);
  });

  it("stands down once the beat was seen", async () => {
    const user = await notifiable();
    const { sessionId } = await tonight(user, ["work"]);
    await user.t.mutation(api.compounding.unlocks.markSeen, { sessionId });
    await nextDay(user);
    expect(sentPushes).toEqual([]);
    expect(await logs(user)).toEqual([]);
  });

  it("respects notifications off, milestones off, and the quiet window", async () => {
    const offs: Partial<Doc<"preferences">["notifications"]>[] = [
      { enabled: false },
      { milestone: false },
      // Every hour is before 24: always quiet.
      { timezone: "UTC", quietWindow: { dontReachBefore: 24, dontReachAfter: 23 } },
    ];
    for (const [i, off] of offs.entries()) {
      const user = await notifiable(i + 1, off);
      await tonight(user, ["work"]);
      await nextDay(user);
    }
    expect(sentPushes).toEqual([]);
  });

  it("waits out the quiet window instead of dropping the push", async () => {
    const user = await notifiable(1, { timezone: "UTC", quietWindow: { dontReachBefore: 24, dontReachAfter: 23 } });
    await tonight(user, ["work"]);
    vi.advanceTimersByTime(37 * HOUR); // past the send: quiet, so it re-checks hourly
    await user.root.finishInProgressScheduledFunctions();
    expect(sentPushes).toEqual([]);
    await setPrefs(user, { quietWindow: undefined });
    await nextDay(user);
    expect(sentPushes).toHaveLength(1);
  });

  it("sends at most one a week", async () => {
    const user = await notifiable();
    await seedReading(user, 2, ["romance"]);
    await seedReading(user, 1, ["romance"]);
    expect((await tonight(user, ["work"])).unlock?.domains).toEqual(["work"]);
    vi.advanceTimersByTime(60_000); // a frozen clock would put both sessions in one millisecond
    expect((await tonight(user, ["romance"])).unlock?.domains).toEqual(["love"]);
    await nextDay(user);
    expect(sentPushes).toHaveLength(1);
    expect((await logs(user)).map((l) => l.suppressedReason)).toEqual([undefined, "rate_limit"]);
  });
});

describe("missedPushAt (#523)", () => {
  const unlockAt = Date.UTC(2026, 9, 9, 21); // 21:00 UTC

  it("is this time tomorrow without a usual hour", () => {
    expect(missedPushAt(unlockAt)).toBe(unlockAt + DAY);
  });

  it("is the usual hour nearest this time tomorrow: 12–36 hours out", () => {
    expect(missedPushAt(unlockAt, 19)).toBe(Date.UTC(2026, 9, 10, 19));
    expect(missedPushAt(unlockAt, 6)).toBe(Date.UTC(2026, 9, 11, 6));
    expect(missedPushAt(unlockAt, 10)).toBe(Date.UTC(2026, 9, 10, 10));
    for (let h = 0; h < 24; h++) {
      const at = missedPushAt(unlockAt, h);
      expect(at - unlockAt).toBeGreaterThanOrEqual(12 * HOUR);
      expect(at - unlockAt).toBeLessThanOrEqual(36 * HOUR);
      expect(new Date(at).getUTCHours()).toBe(h);
    }
  });
});
