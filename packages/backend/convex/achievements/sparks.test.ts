// @vitest-environment edge-runtime
/**
 * #698: spending sparks on a streak freeze. What can go wrong: a purchase
 * touches sparks earned, overdraws the balance, pushes freezes past the cap,
 * or buys a freeze that reaches back and bridges a streak already broken.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { FREEZE_CAP } from "../lib/streakFreezes";
import { expectCode } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const set = (
	user: SeededUser,
	fields: Partial<
		Pick<
			Doc<"emotional_profiles">,
			"sparkBalance" | "sparksEarned" | "streakFreezes"
		>
	>
) =>
	user.root.run((ctx) =>
		ctx.db.patch("emotional_profiles", user.profileId, fields)
	);
const profile = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db.get("emotional_profiles", user.profileId)
	) as Promise<Doc<"emotional_profiles">>;
const spends = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("spark_spends")
			.withIndex("by_emotionalProfileId", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);
const buy = (user: SeededUser) =>
	user.t.mutation(api.achievements.sparks.buyFreeze, {});

describe("buyFreeze", () => {
	it("spends 50 from the balance for one freeze, leaving sparks earned alone", async () => {
		const user = await asNewUser();
		await set(user, { sparkBalance: 80, sparksEarned: 120, streakFreezes: 0 });

		await buy(user);

		const after = await profile(user);
		expect(after.sparkBalance).toBe(30);
		expect(after.sparksEarned).toBe(120);
		expect(after.streakFreezes).toBe(1);
		expect(await spends(user)).toMatchObject([
			{ item: "streak_freeze", sparks: 50 },
		]);
	});

	it("refuses under 50 sparks and changes nothing", async () => {
		const user = await asNewUser();
		await set(user, { sparkBalance: 49, sparksEarned: 49, streakFreezes: 0 });

		await expectCode(() => buy(user), "insufficient_sparks");

		const after = await profile(user);
		expect(after.sparkBalance).toBe(49);
		expect(after.streakFreezes).toBe(0);
		expect(await spends(user)).toEqual([]);
	});

	it("refuses at the freeze cap and changes nothing", async () => {
		const user = await asNewUser();
		await set(user, {
			sparkBalance: 200,
			sparksEarned: 200,
			streakFreezes: FREEZE_CAP,
		});

		await expectCode(() => buy(user), "freeze_cap_reached");

		const after = await profile(user);
		expect(after.sparkBalance).toBe(200);
		expect(after.streakFreezes).toBe(FREEZE_CAP);
		expect(await spends(user)).toEqual([]);
	});

	it("never takes a second buy past the cap", async () => {
		const user = await asNewUser();
		await set(user, {
			sparkBalance: 500,
			sparksEarned: 500,
			streakFreezes: FREEZE_CAP - 1,
		});

		await buy(user);
		await expectCode(() => buy(user), "freeze_cap_reached");

		const after = await profile(user);
		expect(after.streakFreezes).toBe(FREEZE_CAP);
		expect(after.sparkBalance).toBe(450);
	});

	describe("around a missed day", () => {
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

		it("counts the stock after a missed day spent a freeze", async () => {
			const user = await asNewUser();
			await showUp(user, 0);
			await showUp(user, 1);
			await set(user, {
				sparkBalance: 100,
				sparksEarned: 100,
				streakFreezes: FREEZE_CAP,
			});
			// Day 2 missed: a freeze covers it, leaving room for one more.
			vi.setSystemTime(BASE + 3 * DAY);

			await buy(user);

			const after = await profile(user);
			expect(after.streakFreezes).toBe(FREEZE_CAP);
			expect(after.currentStreak).toBe(2);
		});

		it("refuses a freeze that would reach back and save a lapsed streak", async () => {
			const user = await asNewUser();
			await showUp(user, 0);
			await showUp(user, 1);
			await set(user, {
				sparkBalance: 100,
				sparksEarned: 100,
				streakFreezes: 1,
			});
			// Days 2 and 3 missed with one freeze: the streak has lapsed.
			vi.setSystemTime(BASE + 4 * DAY);

			await expectCode(() => buy(user), "streak_lapsed");

			const after = await profile(user);
			expect(after.streakFreezes).toBe(1);
			expect(after.sparkBalance).toBe(100);
		});

		it("sells one again once showing up starts the next streak", async () => {
			const user = await asNewUser();
			await showUp(user, 0);
			await set(user, {
				sparkBalance: 100,
				sparksEarned: 100,
				streakFreezes: 0,
			});
			await showUp(user, 4);
			vi.setSystemTime(BASE + 4 * DAY);

			await buy(user);

			expect((await profile(user)).streakFreezes).toBe(1);
		});
	});
});
