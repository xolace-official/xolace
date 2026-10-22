// @vitest-environment edge-runtime
/**
 * An unlock survives retention (#535), through the real completeSession path
 * and the real retention job.
 *
 * Failure modes: retention leaving a recorded domain fewer days, so it re-locks
 * and the next session replays its beat and push; a domain retention left with
 * no readings keeping its stamp, so it never goes cold (CONTEXT.md).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { runEvaluations, scheduledCalls, seedMetadata, seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock, anthropicMock, noopJob, posthogMock, ragMock, revenuecatMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../revenuecat", () => revenuecatMock(() => false));
vi.mock("../ai/providers/anthropic", async (orig) => ({
  ...(await orig<typeof import("../ai/providers/anthropic")>()),
  ...anthropicMock("A check-in."),
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

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const DAY = 86_400_000;

async function seedReading(user: SeededUser, daysAgo: number) {
  const sessionId = await seedSession(user.root, user.profileId, {
    state: "completed",
    confirmationState: "confirmed",
    createdAt: Date.now() - daysAgo * DAY,
  });
  await seedMetadata(user.root, sessionId, user.profileId, { intensity: 5, thematicTags: ["work"] });
}

/** Complete tonight's work session for real; its unlock stamp, if any. */
async function tonight(user: SeededUser) {
  const sessionId = await seedSession(user.root, user.profileId, { state: "confirmed" });
  await seedMetadata(user.root, sessionId, user.profileId, { intensity: 5, thematicTags: ["work"] });
  await user.t.mutation(api.sessions.completeSession, { sessionId });
  await runEvaluations(user.root);
  const session = await user.root.run((ctx) => ctx.db.get("sessions", sessionId));
  return { sessionId, unlock: session?.domainUnlock };
}

const pushFor = async (user: SeededUser, sessionId: Id<"sessions">) =>
  (await scheduledCalls(user.root)).filter(
    (f) => f.name.includes("unlocks:sendMissedPush") && f.args.sessionId === sessionId,
  );

const stamps = (user: SeededUser) =>
  user.root.run(async (ctx) => (await ctx.db.get("emotional_profiles", user.profileId))?.unlockedDomains ?? []);

/** Work unlocked tonight; six months and five days on, retention runs (and its prune). */
async function unlockedThenRetained(between: (user: SeededUser) => Promise<void> = async () => {}) {
  const user = await asNewUser();
  await user.root.run(async (ctx) => {
    const p = (await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
      .unique())!;
    await ctx.db.patch("preferences", p._id, { dataRetentionPreference: "6_months" });
  });
  await seedReading(user, 2);
  await seedReading(user, 1);
  expect((await tonight(user)).unlock).toEqual({ domains: ["work"], first: true });
  vi.setSystemTime(Date.now() + 185 * DAY);
  await between(user);
  await user.root.mutation(internal.jobs.dataRetention.enforce, {});
  const prunes = await user.root.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").collect()).filter(
      (j) => j.state.kind === "pending" && j.name.includes("unlocks") && j.name.includes("dropColdUnlocks"),
    ),
  );
  expect(prunes).toHaveLength(1);
  await user.root.mutation(internal.compounding.unlocks.dropColdUnlocks, prunes[0].args[0] as never);
  return user;
}

describe("an unlock survives retention (#535)", () => {
  it("doesn't replay the beat or push when retention leaves the domain fewer days", async () => {
    const user = await unlockedThenRetained(async (u) => {
      await seedReading(u, 15);
      await seedReading(u, 10);
    });
    expect(await stamps(user)).toHaveLength(1);
    const again = await tonight(user);
    expect(again.unlock).toBeUndefined();
    expect(await pushFor(user, again.sessionId)).toHaveLength(0);
  });

  it("goes cold when retention leaves the domain no readings: a return unlocks afresh", async () => {
    const user = await unlockedThenRetained();
    expect(await stamps(user)).toEqual([]);
    await seedReading(user, 2);
    await seedReading(user, 1);
    expect((await tonight(user)).unlock).toEqual({ domains: ["work"], first: true });
  });
});
