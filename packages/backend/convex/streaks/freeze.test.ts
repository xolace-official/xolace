// @vitest-environment edge-runtime
/**
 * #434: streak freeze. What can go wrong: a freeze bridges more than the days
 * it covers, originates a streak from nothing, gets consumed twice, writes an
 * activity_log row, never gets earned or earns past the cap, or the display
 * still lapses a non-reflect streak off lastSessionAt.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { acknowledgeFrozenDays, settleOnOpen, settleStreak, streakState } from "./state";
import type { ActivityActionType } from "./activityLog";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 5, 12); // noon UTC; test users have no timezone → UTC
const at = (day: number) => BASE + day * DAY;

const record = (user: SeededUser, day: number, actionType: ActivityActionType = "vent", base = BASE) =>
  user.t.mutation(internal.streaks.manual.recordActivityManual, {
    emotionalProfileId: user.profileId,
    actionType,
    timestamp: base + day * DAY,
  });
const profile = (user: SeededUser) =>
  user.root.run((ctx) => ctx.db.get("emotional_profiles", user.profileId)) as Promise<Doc<"emotional_profiles">>;
const setFreezes = (user: SeededUser, streakFreezes: number) =>
  user.root.run((ctx) => ctx.db.patch("emotional_profiles", user.profileId, { streakFreezes }));
const frozen = (user: SeededUser) =>
  user.root.run(async (ctx) =>
    (
      await ctx.db
        .query("frozen_days")
        .withIndex("by_emotionalProfileId_and_dayKey", (q) => q.eq("emotionalProfileId", user.profileId))
        .collect()
    ).map((f) => f.dayKey),
  );
const stateAt = (user: SeededUser, day: number) =>
  user.root.run(async (ctx) => streakState(ctx, (await ctx.db.get("emotional_profiles", user.profileId))!, at(day)));
const settleAt = (user: SeededUser, day: number) =>
  user.root.run(async (ctx) => {
    await settleStreak(ctx, (await ctx.db.get("emotional_profiles", user.profileId))!, at(day));
  });

describe("streak freeze (#434)", () => {
  it("one missed day with a freeze: streak holds, frozen day written, freeze spent", async () => {
    const user = await asNewUser();
    await record(user, 0);
    await record(user, 1);
    await setFreezes(user, 1);

    expect((await stateAt(user, 3)).streak).toBe(2);
    await settleAt(user, 3);
    expect(await frozen(user)).toEqual(["2026-01-07"]);
    expect((await profile(user)).streakFreezes).toBe(0);

    // Idempotent: a second read-time settle finds no gap left.
    await settleAt(user, 3);
    expect(await frozen(user)).toEqual(["2026-01-07"]);
    expect((await stateAt(user, 3)).streak).toBe(2);
  });

  it("acting the day after a bridged gap continues the streak and writes no log row for the frozen day", async () => {
    const user = await asNewUser();
    await record(user, 0);
    await record(user, 1);
    await setFreezes(user, 1);
    await record(user, 3);

    const p = await profile(user);
    expect(p.currentStreak).toBe(3);
    expect(p.streakFreezes).toBe(0);
    expect(await frozen(user)).toEqual(["2026-01-07"]);
    const logDays = await user.root.run(async (ctx) =>
      (await ctx.db.query("activity_log").collect()).map((r) => r.dayKey),
    );
    expect(logDays).not.toContain("2026-01-07");
  });

  it("one missed day without a freeze lapses", async () => {
    const user = await asNewUser();
    await record(user, 0);
    expect((await stateAt(user, 2)).streak).toBe(0);
  });

  it("a gap wider than the freezes on hand lapses and spends nothing", async () => {
    const user = await asNewUser();
    await record(user, 0);
    await setFreezes(user, 1);
    expect((await stateAt(user, 3)).streak).toBe(0);
    await settleAt(user, 3);
    expect(await frozen(user)).toEqual([]);
    expect((await profile(user)).streakFreezes).toBe(1);
  });

  it("each freeze covers one missed day", async () => {
    const user = await asNewUser();
    await record(user, 0);
    await setFreezes(user, 2);
    await settleAt(user, 3);
    expect(await frozen(user)).toEqual(["2026-01-06", "2026-01-07"]);
    expect((await profile(user)).streakFreezes).toBe(0);
    expect((await stateAt(user, 3)).streak).toBe(1);
  });

  it("never originates a streak from nothing", async () => {
    const user = await asNewUser();
    await setFreezes(user, 2);
    await settleAt(user, 3);
    expect(await frozen(user)).toEqual([]);
    expect((await stateAt(user, 3)).streak).toBe(0);

    // A zero-weight quotes row is not a last-qualifying day either.
    await record(user, 0, "quotes");
    await settleAt(user, 2);
    expect(await frozen(user)).toEqual([]);
  });

  it("earns +1 per 7 consecutive days, capped at 2", async () => {
    const user = await asNewUser();
    for (let d = 0; d < 6; d++) await record(user, d);
    expect((await profile(user)).streakFreezes ?? 0).toBe(0);
    await record(user, 6);
    expect((await profile(user)).streakFreezes).toBe(1);
    await record(user, 6, "reflect"); // same day again: no second earn
    expect((await profile(user)).streakFreezes).toBe(1);
    for (let d = 7; d < 21; d++) await record(user, d);
    expect((await profile(user)).currentStreak).toBe(21);
    expect((await profile(user)).streakFreezes).toBe(2);
  });

  it("strict earning: a week bridged by a freeze doesn't earn; 7 real days after the frozen day do", async () => {
    const user = await asNewUser();
    for (let d = 0; d < 4; d++) await record(user, d);
    await setFreezes(user, 1);
    for (let d = 5; d < 8; d++) await record(user, d); // day 4 frozen
    expect((await profile(user)).currentStreak).toBe(7);
    expect((await profile(user)).streakFreezes).toBe(0);
    for (let d = 8; d < 12; d++) await record(user, d);
    expect((await profile(user)).streakFreezes).toBe(1);
  });

  it("getSummary keeps a non-reflect streak lit past 48h from lastSessionAt", async () => {
    // reflect Mon, vent Tue–Thu → 4, though the last reflect is 72h back.
    const user = await asNewUser();
    const now = Date.now();
    await record(user, -3, "reflect", now);
    await record(user, -2, "vent", now);
    await record(user, -1, "vent", now);
    await record(user, 0, "vent", now);
    const summary = await user.t.query(api.profile.getSummary, {});
    expect(summary.currentStreak).toBe(4);
    const context = await user.t.query(api.users.getFullContext, {});
    expect(context.streak).toBe(4);
  });

  it("app open surfaces a bridged gap until acknowledged, then never again (#436)", async () => {
    // Fails if: the banner repeats after it showed, drops a bridge nobody saw
    // (killed app, old client), misses one recordActivity wrote before the
    // open, or fires with no freeze spent.
    const user = await asNewUser();
    const openAt = (day: number) =>
      user.root.run(async (ctx) => settleOnOpen(ctx, (await ctx.db.get("emotional_profiles", user.profileId))!, at(day)));
    const acknowledge = () =>
      user.root.run(async (ctx) => acknowledgeFrozenDays(ctx, (await ctx.db.get("emotional_profiles", user.profileId))!));
    await record(user, 0);
    await record(user, 1);
    expect(await openAt(1)).toBe(0);
    await setFreezes(user, 2);

    expect(await openAt(3)).toBe(1); // day 2 bridged
    expect(await openAt(3)).toBe(1); // never shown: still pending
    await acknowledge();
    expect(await openAt(3)).toBe(0);
    // The acknowledged profile still passes getFullContext's returns validator.
    await expect(user.t.query(api.users.getFullContext, {})).resolves.toBeTruthy();
    await record(user, 3);

    // Bridged by recordActivity, not the open: still surfaces on the next open.
    await record(user, 5);
    expect(await openAt(5)).toBe(1); // day 4
    await acknowledge();
    expect(await openAt(6)).toBe(0);
    expect((await profile(user)).streakFreezes).toBe(0);
  });
});
