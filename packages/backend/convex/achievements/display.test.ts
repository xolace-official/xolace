// @vitest-environment edge-runtime
/**
 * #692: what the achievements screen and badge detail page read. What can go
 * wrong: a locked rung shows progress it isn't next for, the shelf order
 * hides the next rung among the locked ones, a badge with no art breaks the
 * row, or one user sees another's badges.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { localDayKey } from "../streaks/activityLog";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { awardAchievement } from "./award";
import { type AchievementId, BADGE_ART_FALLBACK } from "./catalog";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

type Shelf = Awaited<ReturnType<typeof overviewOf>>;

const overviewOf = (user: SeededUser) =>
	user.t.query(api.achievements.display.overview, {});

/** Earned badges by id, through the one write path. */
const earn = (user: SeededUser, ...ids: AchievementId[]) =>
	user.root.run(async (ctx) => {
		for (const id of ids) {
			await awardAchievement(ctx, user.profileId, id);
		}
	});

/**
 * A user four days into a streak, seven days showed up, two pieces read and
 * two areas unlocked, holding the first rung of each ladder.
 */
async function midLadderUser() {
	const user = await asNewUser();
	await earn(user, "streak-3", "showing-up-5", "first-read", "understanding-1");
	await user.root.run(async (ctx) => {
		const now = Date.now();
		await ctx.db.patch("emotional_profiles", user.profileId, {
			currentStreak: 4,
			daysShowedUp: 7,
			longestStreak: 4,
			unlockedDomains: [
				{ at: now, domain: "self" },
				{ at: now, domain: "work" },
			],
		});
		await ctx.db.insert("activity_log", {
			actionType: "reflect",
			count: 1,
			createdAt: now,
			dayKey: localDayKey(now, "UTC"),
			emotionalProfileId: user.profileId,
			updatedAt: now,
		});
		for (const slug of ["a", "b", "c"]) {
			const entryId = await ctx.db.insert("library_entries", {
				active: true,
				dek: slug,
				kind: "advice",
				lastReviewedAt: 1,
				primarySubject: "anxiety",
				readMin: 4,
				reuse: "adapted",
				slug,
				title: slug,
			});
			await ctx.db.insert("library_reads", {
				emotionalProfileId: user.profileId,
				entryId,
				// "c" was opened but never finished: it doesn't count.
				finishedAt: slug === "c" ? undefined : now,
				helped: false,
				saved: false,
			});
		}
	});
	return user;
}

const row = (shelf: Shelf, category: string) =>
	shelf.categories
		.find((c) => c.category === category)
		?.achievements.map((a) => ({
			id: a.achievementId,
			...(a.earnedAt !== undefined && { earned: true }),
			...(a.progress && { progress: a.progress }),
		})) ?? [];

describe("overview", () => {
	it("shows a fresh account Joined earned and First session up next", async () => {
		const user = await asNewUser();

		const overview = await user.t.query(api.achievements.display.overview, {});

		expect(overview.sparks).toMatchObject({
			badgeCount: 1,
			balance: 10,
			earned: 10,
			freezePrice: 50,
		});
		expect(overview.sparks.latest?.achievementId).toBe("joined");
		expect(overview.sparks.nextUp).toMatchObject({
			achievementId: "first-session",
			progress: { current: 0, target: 1 },
		});
		const gettingStarted = overview.categories[0];
		expect(gettingStarted?.title).toBe("Getting started");
		expect(
			gettingStarted?.achievements.map((a) => [a.achievementId, a.earnedAt])
		).toEqual([
			["joined", expect.any(Number)],
			["first-session", undefined],
		]);
		expect(overview.categories.map((c) => c.category)).toEqual([
			"getting_started",
			"streak",
			"showing_up",
			"exploring",
			"understanding",
		]);
	});

	it("puts progress on each ladder's next rung only, between earned and locked", async () => {
		const shelf = await overviewOf(await midLadderUser());

		expect(row(shelf, "streak").slice(0, 3)).toEqual([
			{ earned: true, id: "streak-3" },
			{
				id: "streak-5",
				progress: { current: 4, target: 5, unit: "days in a row" },
			},
			{ id: "streak-7" },
		]);
		expect(row(shelf, "showing_up").slice(0, 3)).toEqual([
			{ earned: true, id: "showing-up-5" },
			{
				id: "showing-up-10",
				progress: { current: 7, target: 10, unit: "days showing up" },
			},
			{ id: "showing-up-25" },
		]);
		const exploring = row(shelf, "exploring");
		expect(exploring.slice(0, 2)).toEqual([
			{ earned: true, id: "first-read" },
			{
				id: "read-5",
				progress: { current: 2, target: 5, unit: "pieces read" },
			},
		]);
		// One-offs have nothing to count, so no progress anywhere else.
		expect(exploring.filter((a) => a.progress)).toHaveLength(1);
		expect(row(shelf, "understanding")).toEqual([
			{ earned: true, id: "understanding-1" },
			{
				id: "understanding-3",
				progress: { current: 2, target: 3, unit: "areas unlocked" },
			},
			{ id: "understanding-8" },
		]);
		// streak-5 at 4 of 5 is closest to done.
		expect(shelf.sparks.nextUp?.achievementId).toBe("streak-5");
		expect(shelf.sparks.badgeCount).toBe(5);
	});

	it("lists the streak row through the first year, sized by streak rungs alone", async () => {
		const user = await asNewUser();
		await earn(user, "showing-up-500");

		const streak = row(await overviewOf(user), "streak");

		expect(streak.at(-1)?.id).toBe("streak-365");
	});

	it("draws a badge with no art row as the fallback, flagged, without dropping it", async () => {
		const user = await asNewUser();
		for (const artKey of ["joined", BADGE_ART_FALLBACK]) {
			const storageId = await user.root.run((ctx) =>
				ctx.storage.store(new Blob([artKey], { type: "image/webp" }))
			);
			await user.root.mutation(internal.achievements.art.upsertArt, {
				artKey,
				sha256: artKey === "joined" ? "a".repeat(64) : "b".repeat(64),
				storageId,
				thumbhash: "1QcSHQRnh493V4dIh4eXh1h4kJUI",
			});
		}

		const [joined, firstSession] =
			(await overviewOf(user)).categories[0]?.achievements ?? [];

		expect(joined?.art).toMatchObject({
			fallback: false,
			url: expect.any(String),
		});
		expect(firstSession?.art).toMatchObject({
			fallback: true,
			url: expect.any(String),
		});
		expect(firstSession?.art.url).not.toBe(joined?.art.url);
	});
});

describe("get", () => {
	const get = (user: SeededUser, achievementId: string) =>
		user.t.query(api.achievements.display.get, { achievementId });

	it("gives an earned badge its date and the sparks it awarded", async () => {
		const user = await midLadderUser();

		const badge = await get(user, "streak-3");

		expect(badge).toMatchObject({
			achievementId: "streak-3",
			earnedAt: expect.any(Number),
			sparks: 10,
			title: "3 days by the fire",
		});
		expect(badge?.progress).toBeUndefined();
	});

	it("gives the next rung its progress and a later rung none", async () => {
		const user = await midLadderUser();

		expect((await get(user, "read-5"))?.progress).toEqual({
			current: 2,
			target: 5,
			unit: "pieces read",
		});
		const later = await get(user, "read-10");
		expect(later).toMatchObject({ achievementId: "read-10", sparks: 25 });
		expect(later?.earnedAt).toBeUndefined();
		expect(later?.progress).toBeUndefined();
	});

	it("still shows a streak rung far past the listed ladder", async () => {
		const user = await asNewUser();

		expect(await get(user, "streak-3650")).toMatchObject({
			achievementId: "streak-3650",
			title: "10 years by the fire",
		});
	});

	it("is null for an id the catalog doesn't know", async () => {
		const user = await asNewUser();

		expect(await get(user, "streak-4")).toBeNull();
		expect(await get(user, "first-check-in")).toBeNull();
	});
});

describe("access", () => {
	it("shows each user only their own badges", async () => {
		const first = await midLadderUser();
		const second = await asNewUser(2, first.root);

		const shelf = await overviewOf(second);

		expect(shelf.sparks.badgeCount).toBe(1);
		expect(row(shelf, "streak")[0]).toEqual({
			id: "streak-3",
			progress: { current: 0, target: 3, unit: "days in a row" },
		});
		expect(
			(
				await second.t.query(api.achievements.display.get, {
					achievementId: "streak-3",
				})
			)?.earnedAt
		).toBeUndefined();
	});

	it("refuses an anonymous caller", async () => {
		const user = await asNewUser();
		await expect(
			user.root.query(api.achievements.display.overview, {})
		).rejects.toThrow(/not_authenticated|Not authenticated/);
	});
});
