// @vitest-environment edge-runtime
/**
 * #435: streak-saver revive. What can go wrong: savers never get earned, earn
 * off-milestone, or pile past the cap of 1; revive restores the wrong count,
 * works outside its window, without a saver, or while a freeze covers the gap;
 * revive writes a log/frozen row for the missed day (the gap must stay honest);
 * or the next read lapses the revived streak again because the gap still counts.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { isStreakMilestone } from "./milestones";
import { reviveStreak } from "./revive";
import { streakState } from "./state";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 5, 12); // noon UTC; test users have no timezone → UTC
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
const profile = (user: SeededUser) =>
  user.root.run((ctx) => ctx.db.get("emotional_profiles", user.profileId)) as Promise<Doc<"emotional_profiles">>;
const patch = (user: SeededUser, fields: Partial<Doc<"emotional_profiles">>) =>
  user.root.run((ctx) => ctx.db.patch("emotional_profiles", user.profileId, fields));
const stateAt = (user: SeededUser, day: number) =>
  user.root.run(async (ctx) => streakState(ctx, (await ctx.db.get("emotional_profiles", user.profileId))!, at(day)));
const reviveAt = (user: SeededUser, day: number) =>
  user.root.run(async (ctx) => reviveStreak(ctx, (await ctx.db.get("emotional_profiles", user.profileId))!, at(day)));
const rowCounts = (user: SeededUser) =>
  user.root.run(async (ctx) => ({
    logDays: (await ctx.db.query("activity_log").collect()).map((r) => r.dayKey),
    frozen: (await ctx.db.query("frozen_days").collect()).length,
  }));

describe("milestone cadence", () => {
  it("7, 30, 100, then every 100", () => {
    for (const n of [7, 30, 100, 200, 300, 1000]) expect(isStreakMilestone(n)).toBe(true);
    for (const n of [0, 1, 6, 8, 14, 21, 50, 99, 150, 250]) expect(isStreakMilestone(n)).toBe(false);
  });
});

describe("streak-saver earning (#435)", () => {
  it("earns one at 7, capped at 1 outstanding through 30", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 6);
    expect((await profile(user)).streakSavers ?? 0).toBe(0);
    await record(user, 6);
    expect((await profile(user)).streakSavers).toBe(1);
    await recordDays(user, 7, 30);
    expect((await profile(user)).currentStreak).toBe(30);
    expect((await profile(user)).streakSavers).toBe(1);
  });
});

describe("streak revive (#435)", () => {
  it("restores the exact prior streak the day after the missed day, leaving the gap unlogged", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 5);
    await patch(user, { streakSavers: 1 });

    const broken = await stateAt(user, 6); // day 5 missed
    expect(broken.streak).toBe(0);
    expect(broken.revive).toEqual({ streak: 5, gapDay: "2026-01-10" });

    await reviveAt(user, 6);
    expect((await stateAt(user, 6)).streak).toBe(5);
    expect((await profile(user)).streakSavers).toBe(0);
    const rows = await rowCounts(user);
    expect(rows.logDays).not.toContain("2026-01-10");
    expect(rows.frozen).toBe(0);

    // Acting today continues from the restored count.
    await record(user, 6);
    expect((await profile(user)).currentStreak).toBe(6);
  });

  it("acting on the break day before reviving still restores the run", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 5);
    await patch(user, { streakSavers: 1 });
    await record(user, 6); // resets to 1
    expect((await profile(user)).currentStreak).toBe(1);
    expect((await stateAt(user, 6)).revive).toEqual({ streak: 6, gapDay: "2026-01-10" });

    await reviveAt(user, 6);
    expect((await stateAt(user, 6)).streak).toBe(6);
    await record(user, 7);
    expect((await profile(user)).currentStreak).toBe(7);
  });

  it("acting first then reviving earns the same as reviving first", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 6);
    await patch(user, { streakSavers: 1 });
    await record(user, 7); // day 6 missed; restores 6 + today = 7
    await reviveAt(user, 7);
    const p = await profile(user);
    expect(p.currentStreak).toBe(7);
    expect(p.streakSavers).toBe(1); // spent one, earned one at 7
  });

  it("a revived day restarts the freeze count, like a frozen day", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 4);
    await patch(user, { streakSavers: 1 });
    await reviveAt(user, 5); // day 4 revived
    await recordDays(user, 5, 8); // streak 7, but only 3 real days since the gap
    expect((await profile(user)).currentStreak).toBe(7);
    expect((await profile(user)).streakFreezes ?? 0).toBe(0);
  });

  it("is gone once the window passes", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 5);
    await patch(user, { streakSavers: 1 });
    expect((await stateAt(user, 7)).revive).toBeUndefined();
    await expect(reviveAt(user, 7)).rejects.toThrow();
    expect((await profile(user)).streakSavers).toBe(1);
  });

  it("needs a saver", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 5);
    expect((await stateAt(user, 6)).revive).toBeUndefined();
    await expect(reviveAt(user, 6)).rejects.toThrow();
  });

  it("is unavailable while a freeze covers the gap", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 5);
    await patch(user, { streakSavers: 1, streakFreezes: 1 });
    const state = await stateAt(user, 6);
    expect(state.streak).toBe(5);
    expect(state.revive).toBeUndefined();
    await expect(reviveAt(user, 6)).rejects.toThrow();
    expect((await profile(user)).streakSavers).toBe(1);
  });

  it("can't be spent twice on the same break", async () => {
    const user = await asNewUser();
    await recordDays(user, 0, 5);
    await patch(user, { streakSavers: 1 });
    await reviveAt(user, 6);
    await patch(user, { streakSavers: 1 });
    expect((await stateAt(user, 6)).revive).toBeUndefined();
    await expect(reviveAt(user, 6)).rejects.toThrow();
  });
});
