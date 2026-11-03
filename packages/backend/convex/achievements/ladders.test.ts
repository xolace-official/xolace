// @vitest-environment edge-runtime
/**
 * #694: the Streak and Showing up ladders, earned through recordActivity and
 * reviveStreak. What can go wrong: a rung is missed (reached by a revive, or
 * skipped over on the open-ended ladder), awarded twice, or taken back when
 * the streak breaks; days showed up counts a day twice, counts a quotes-only
 * day, or is lost in a data wipe.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActivityActionType } from "../streaks/activityLog";
import { reviveStreak } from "../streaks/revive";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { findAchievement } from "./catalog";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 5, 12); // noon UTC; test users have no timezone → UTC
const at = (day: number) => BASE + day * DAY;

const record = (
	user: SeededUser,
	day: number,
	actionType: ActivityActionType = "sit_with_this"
) =>
	user.t.mutation(internal.streaks.manual.recordActivityManual, {
		actionType,
		emotionalProfileId: user.profileId,
		timestamp: at(day),
	});
const recordDays = async (user: SeededUser, from: number, to: number) => {
	for (let d = from; d < to; d++) {
		await record(user, d);
	}
};
const earned = async (user: SeededUser, prefix: string) =>
	(
		await user.root.run((ctx) =>
			ctx.db
				.query("user_achievements")
				.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		)
	)
		.map((r) => r.achievementId)
		.filter((id) => id.startsWith(prefix));
const profile = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db.get("emotional_profiles", user.profileId)
	) as Promise<Doc<"emotional_profiles">>;

describe("Streak ladder", () => {
	it("a 3-day streak earns 3 days by the fire", async () => {
		const user = await asNewUser();
		await recordDays(user, 0, 2);
		expect(await earned(user, "streak-")).toEqual([]);

		await record(user, 2);
		expect(await earned(user, "streak-")).toEqual(["streak-3"]);
	});

	it("a broken streak keeps its badges, and climbing again awards nothing twice", async () => {
		const user = await asNewUser();
		await recordDays(user, 0, 5);
		expect(await earned(user, "streak-")).toEqual(["streak-3", "streak-5"]);

		// Day 5 and 6 missed: the streak resets to 1 and climbs past 3 and 5 again.
		await recordDays(user, 7, 12);
		expect((await profile(user)).currentStreak).toBe(5);
		expect(await earned(user, "streak-")).toEqual(["streak-3", "streak-5"]);

		await recordDays(user, 12, 14);
		expect(await earned(user, "streak-")).toEqual([
			"streak-3",
			"streak-5",
			"streak-7",
		]);
	});

	it("a second action on a rung day awards nothing more", async () => {
		const user = await asNewUser();
		await recordDays(user, 0, 3);
		const sparksBefore = (await profile(user)).sparksEarned;
		await record(user, 2, "daily_mood");

		expect(await earned(user, "streak-")).toEqual(["streak-3"]);
		expect((await profile(user)).sparksEarned).toBe(sparksBefore);
	});

	it("a revive that restores the run onto a rung earns it", async () => {
		const user = await asNewUser();
		await recordDays(user, 0, 6);
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, { streakSavers: 1 })
		);
		// Day 6 missed; acting on day 7 resets to 1, the revive restores 6 + today.
		await record(user, 7);
		expect(await earned(user, "streak-")).toEqual(["streak-3", "streak-5"]);

		await user.root.run(async (ctx) =>
			reviveStreak(
				ctx,
				(await ctx.db.get("emotional_profiles", user.profileId))!,
				at(7)
			)
		);
		expect((await profile(user)).longestStreak).toBe(7);
		expect(await earned(user, "streak-")).toEqual([
			"streak-3",
			"streak-5",
			"streak-7",
		]);
	});

	it("one step that crosses several rungs earns every one of them", async () => {
		const user = await asNewUser();
		await record(user, 0);
		// A legacy row whose longestStreak lags the run it's on.
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				currentStreak: 20,
				longestStreak: 2,
			})
		);
		await record(user, 1);

		expect(await earned(user, "streak-")).toEqual([
			"streak-3",
			"streak-5",
			"streak-7",
			"streak-10",
			"streak-14",
			"streak-21",
		]);
	});

	it("earns the open-ended rungs (230, 260, 365, 730) and nothing between", async () => {
		const user = await asNewUser();
		await record(user, 0);
		/** Put a run of `days - 1` behind yesterday, then act today: the streak reaches `days`. */
		const stepOnto = async (days: number, day: number) => {
			await user.root.run((ctx) =>
				ctx.db.patch("emotional_profiles", user.profileId, {
					currentStreak: days - 1,
					longestStreak: days - 1,
				})
			);
			await record(user, day);
			expect((await profile(user)).longestStreak).toBe(days);
			return await earned(user, "streak-");
		};

		expect(await stepOnto(229, 1)).toEqual([]);
		expect(await stepOnto(230, 2)).toEqual(["streak-230"]);
		expect(await stepOnto(231, 3)).toEqual(["streak-230"]);
		expect(await stepOnto(260, 4)).toEqual(["streak-230", "streak-260"]);
		expect(await stepOnto(364, 5)).toEqual(["streak-230", "streak-260"]);
		expect(await stepOnto(365, 6)).toEqual([
			"streak-230",
			"streak-260",
			"streak-365",
		]);
		expect(await stepOnto(730, 7)).toEqual([
			"streak-230",
			"streak-260",
			"streak-365",
			"streak-730",
		]);
	});
});

const daysShowedUp = async (user: SeededUser) =>
	(await profile(user)).daysShowedUp ?? 0;

describe("days showed up", () => {
	it("several actions on one day raise it once", async () => {
		const user = await asNewUser();
		await record(user, 0, "sit_with_this");
		await record(user, 0, "sit_with_this");
		await record(user, 0, "daily_mood");
		await record(user, 0, "library");

		expect(await daysShowedUp(user)).toBe(1);
	});

	it("a quotes-only day doesn't raise it, and a later qualifying action that day does", async () => {
		const user = await asNewUser();
		await record(user, 0, "quotes");
		expect(await daysShowedUp(user)).toBe(0);

		await record(user, 0, "daily_mood");
		expect(await daysShowedUp(user)).toBe(1);
	});

	it("counts days with gaps, never resetting when the streak breaks", async () => {
		const user = await asNewUser();
		await recordDays(user, 0, 2);
		await recordDays(user, 5, 7);

		expect((await profile(user)).currentStreak).toBe(2);
		expect(await daysShowedUp(user)).toBe(4);
	});

	it("the fifth day showed up earns 5 days showing up, once", async () => {
		const user = await asNewUser();
		// Gaps between every day, so no streak rung muddies the sparks.
		for (const day of [0, 2, 4, 6]) {
			await record(user, day);
		}
		expect(await earned(user, "showing-up-")).toEqual([]);
		const sparksBefore = (await profile(user)).sparksEarned ?? 0;

		await record(user, 8);
		await record(user, 8, "daily_mood");
		expect(await earned(user, "showing-up-")).toEqual(["showing-up-5"]);
		expect((await profile(user)).sparksEarned).toBe(
			sparksBefore + (findAchievement("showing-up-5")?.sparks ?? 0)
		);

		await record(user, 10);
		expect(await earned(user, "showing-up-")).toEqual(["showing-up-5"]);
	});

	it("earns each rung as the counter reaches it", async () => {
		const user = await asNewUser();
		await record(user, 0);
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, { daysShowedUp: 99 })
		);
		await record(user, 2);

		expect(await daysShowedUp(user)).toBe(100);
		expect(await earned(user, "showing-up-")).toEqual(["showing-up-100"]);
	});

	it("survives a data wipe", async () => {
		const user = await asNewUser();
		await recordDays(user, 0, 3);
		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});

		expect(await daysShowedUp(user)).toBe(3);
		await record(user, 4);
		expect(await daysShowedUp(user)).toBe(4);
	});
});
