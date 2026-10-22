// @vitest-environment edge-runtime
/**
 * #439: streak milestone push. What can go wrong: it fires off-cadence, fires
 * twice for the same streak (a second action the same day), fires with
 * notifications or the sub-flag off, uses the wrong copy, or rides the
 * session-count milestone instead of the streak.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, noopJob, revenuecatMock } from "../test/mocks.helpers";
import { streakMilestoneCopy } from "./milestones";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
// Assert at the enqueue boundary: convex-test runs `runAfter(0)` jobs on a
// real setTimeout, and one that logs after the file finishes trips Vitest's
// "Closing rpc while onUserConsoleLog was pending".
vi.mock("../notifications", async (orig) => ({
  ...(await orig<typeof import("../notifications")>()),
  schedule: noopJob(),
}));
vi.mock("../streamSetup", async (orig) => ({
  ...(await orig<typeof import("../streamSetup")>()),
  addToXolaceChannel: noopJob(),
}));

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 5, 12);
const at = (day: number) => BASE + day * DAY;

const record = (user: SeededUser, day: number) =>
  user.t.mutation(internal.streaks.manual.recordActivityManual, {
    emotionalProfileId: user.profileId,
    actionType: "vent",
    timestamp: at(day),
  });
const recordDays = async (user: SeededUser, from: number, to: number) => {
  for (let d = from; d < to; d++) await record(user, d);
};
const setPrefs = (user: SeededUser, notifications: Partial<Doc<"preferences">["notifications"]>) =>
  user.root.run(async (ctx) => {
    const p = (await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
      .unique())!;
    await ctx.db.patch("preferences", p._id, { notifications: { ...p.notifications, ...notifications } });
  });
const scheduledPushes = (user: SeededUser) =>
  user.root.run(async (ctx) =>
    (await ctx.db.system.query("_scheduled_functions").collect())
      .map((f) => f.args[0] as { type?: string; content?: string })
      .filter((a) => a.type === "streak_milestone")
      .map((a) => a.content),
  );

describe("streakMilestoneCopy (#439)", () => {
  it("uses the fixed copy for 7/30/100 and the count past that", () => {
    expect(streakMilestoneCopy(7)).toBe("7 days by the fire. The flame's holding steady.");
    expect(streakMilestoneCopy(30)).toBe("30 days. This is a rhythm now.");
    expect(streakMilestoneCopy(100)).toBe(
      "100 days. The fire hasn't gone out once — not because you didn't stumble, but because you came back.",
    );
    expect(streakMilestoneCopy(200)).toBe("200 days. Still here.");
    expect(streakMilestoneCopy(1300)).toBe("1300 days. Still here.");
  });
});

describe("streak milestone push (#439)", () => {
  it("schedules once, on day 7, with notifications on", async () => {
    const user = await asNewUser();
    await setPrefs(user, { enabled: true, milestone: true });
    await recordDays(user, 0, 6);
    expect(await scheduledPushes(user)).toEqual([]);
    await record(user, 6);
    await record(user, 6); // a second action the same day doesn't re-fire
    expect(await scheduledPushes(user)).toEqual([streakMilestoneCopy(7)]);
    await recordDays(user, 7, 8);
    expect(await scheduledPushes(user)).toHaveLength(1);
  });

  it("stays silent with notifications off", async () => {
    const user = await asNewUser(); // fresh prefs: enabled false
    await recordDays(user, 0, 7);
    expect(await scheduledPushes(user)).toEqual([]);
  });

  it("the streakMilestone sub-flag overrides the milestone family", async () => {
    const off = await asNewUser();
    await setPrefs(off, { enabled: true, milestone: true, streakMilestone: false });
    await recordDays(off, 0, 7);
    expect(await scheduledPushes(off)).toEqual([]);

    const on = await asNewUser();
    await setPrefs(on, { enabled: true, milestone: false, streakMilestone: true });
    await recordDays(on, 0, 7);
    expect(await scheduledPushes(on)).toEqual([streakMilestoneCopy(7)]);
  });
});
