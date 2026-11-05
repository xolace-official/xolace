// @vitest-environment edge-runtime
/**
 * #698: what the profile's spark card reads. What can go wrong: the counters
 * or freeze stock disagree with what buyFreeze checks, the badge row shows
 * old badges first or more than three, or the count misses badges.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { FREEZE_CAP } from "../lib/streakFreezes";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { awardAchievement } from "./award";
import type { AchievementId } from "./catalog";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const shelfOf = (user: SeededUser) =>
	user.t.query(api.achievements.display.shelf, {});

const earn = (user: SeededUser, ...ids: AchievementId[]) =>
	user.root.run(async (ctx) => {
		let at = Date.now();
		for (const id of ids) {
			at += 1;
			await awardAchievement(ctx, user.profileId, id, at);
		}
	});

describe("shelf", () => {
	it("shows a new user's Joined spark, its badge and the freeze terms", async () => {
		const user = await asNewUser();

		const shelf = await shelfOf(user);

		expect(shelf).toMatchObject({
			badgeCount: 1,
			balance: 10,
			earned: 10,
			freezeCap: FREEZE_CAP,
			freezePrice: 50,
			freezes: 0,
		});
		expect(shelf.badges).toHaveLength(1);
		expect(shelf.badges[0]).toMatchObject({
			achievementId: "joined",
			earnedAt: expect.any(Number),
			title: expect.any(String),
		});
	});

	it("shows the three latest badges, newest first, and counts them all", async () => {
		const user = await asNewUser();
		await earn(
			user,
			"first-session",
			"streak-3",
			"sat-with-it",
			"first-listen"
		);

		const shelf = await shelfOf(user);

		expect(shelf.badgeCount).toBe(5);
		expect(shelf.badges.map((b) => b.achievementId)).toEqual([
			"first-listen",
			"sat-with-it",
			"streak-3",
		]);
	});

	it("shows a bought freeze against the balance, sparks earned untouched", async () => {
		const user = await asNewUser();
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				sparkBalance: 60,
				sparksEarned: 60,
			})
		);

		await user.t.mutation(api.achievements.sparks.buyFreeze, {});

		expect(await shelfOf(user)).toMatchObject({
			balance: 10,
			earned: 60,
			freezes: 1,
		});
	});
});

describe("shelf around a missed day", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	const DAY = 24 * 60 * 60 * 1000;
	const BASE = Date.UTC(2026, 0, 5, 12); // test users have no timezone → UTC
	const showUp = (user: SeededUser, day: number) =>
		user.t.mutation(internal.streaks.manual.recordActivityManual, {
			actionType: "vent",
			emotionalProfileId: user.profileId,
			timestamp: BASE + day * DAY,
		});

	it("flags a lapsed streak, so the card can say why it won't sell a freeze", async () => {
		const user = await asNewUser();
		await showUp(user, 0);
		await showUp(user, 1);
		vi.setSystemTime(BASE + 2 * DAY);
		expect((await shelfOf(user)).streakLapsed).toBe(false);

		// Days 2 and 3 missed with no freeze.
		vi.setSystemTime(BASE + 4 * DAY);

		expect((await shelfOf(user)).streakLapsed).toBe(true);
	});
});
