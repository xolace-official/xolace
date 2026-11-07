// @vitest-environment edge-runtime
/**
 * #693: what the in-app unlock moment reads and stamps. What can go wrong: a
 * backfilled badge pops up as if just earned, a dismissed badge comes back,
 * or one user stamps another's badges as seen.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { awardAchievement, FOLD_AFTER_MS } from "./award";
import type { AchievementId } from "./catalog";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const unseenOf = (user: SeededUser) =>
	user.t.query(api.achievements.unlock.unseen, {});

const earn = (user: SeededUser, ...ids: AchievementId[]) =>
	user.root.run(async (ctx) => {
		let at = Date.now();
		for (const id of ids) {
			at += 1;
			await awardAchievement(ctx, user.profileId, id, at);
		}
	});

describe("unseen", () => {
	it("lists a new user's live Joined badge with what the moment shows", async () => {
		const user = await asNewUser();

		const unseen = await unseenOf(user);

		expect(unseen).toHaveLength(1);
		expect(unseen[0]).toMatchObject({
			achievementId: "joined",
			sparks: 10,
			title: expect.any(String),
		});
		expect(unseen[0]?.copy.length).toBeGreaterThan(0);
		expect(unseen[0]?.art).toEqual({
			fallback: true,
			thumbhash: null,
			url: null,
		});
	});

	it("lists badges earned together in the order they were earned", async () => {
		const user = await asNewUser();
		await earn(user, "first-session", "streak-3");

		const ids = (await unseenOf(user)).map((a) => a.achievementId);

		expect(ids).toEqual(["joined", "first-session", "streak-3"]);
	});

	it("never lists a backfilled badge", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert("user_achievements", {
				achievementId: "streak-3",
				earnedAt: 1,
				emotionalProfileId: user.profileId,
				source: "backfill",
				sparks: 15,
			});
		});

		const ids = (await unseenOf(user)).map((a) => a.achievementId);

		expect(ids).toEqual(["joined"]);
	});

	it("shows each user only their own badges", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await earn(a, "first-session");

		const ids = (await unseenOf(b)).map((x) => x.achievementId);

		expect(ids).toEqual(["joined"]);
	});
});

describe("markSeen", () => {
	it("keeps what was shown from coming back", async () => {
		const user = await asNewUser();
		await earn(user, "first-session");
		const shown = await unseenOf(user);

		await user.t.mutation(api.achievements.unlock.markSeen, {
			ids: shown.map((a) => a.id),
		});

		expect(await unseenOf(user)).toEqual([]);
	});

	it("leaves a badge earned after the moment opened for the next one", async () => {
		const user = await asNewUser();
		const shown = await unseenOf(user);
		await earn(user, "first-session");

		await user.t.mutation(api.achievements.unlock.markSeen, {
			ids: shown.map((a) => a.id),
		});

		const ids = (await unseenOf(user)).map((a) => a.achievementId);
		expect(ids).toEqual(["first-session"]);
	});

	it("can't stamp another user's badges", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		const theirs = await unseenOf(a);

		await b.t.mutation(api.achievements.unlock.markSeen, {
			ids: theirs.map((x) => x.id),
		});

		expect(await unseenOf(a)).toHaveLength(1);
	});
});

/**
 * Old binaries never open the moment, so what they earn stays unseen. A week
 * on it folds into the summary, rather than a row of moments on update.
 */
describe("foldUnseen", () => {
	const fold = (user: SeededUser, achievementId: AchievementId) =>
		user.root.mutation(internal.achievements.unlock.foldUnseen, {
			achievementId,
			emotionalProfileId: user.profileId,
		});
	const summaryOf = (user: SeededUser) =>
		user.t.query(api.achievements.firstSight.summary, {});

	it("is armed for a week after a live award", async () => {
		const user = await asNewUser();
		const before = Date.now();
		await earn(user, "first-session");

		const jobs = await user.root.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect()
		);
		const armed = jobs.find(
			(j) =>
				j.name.endsWith("foldUnseen") &&
				j.args[0]?.achievementId === "first-session"
		);

		expect(armed?.args[0]?.emotionalProfileId).toBe(user.profileId);
		expect(armed?.scheduledTime).toBeGreaterThanOrEqual(before + FOLD_AFTER_MS);
	});

	it("moves an unseen badge from the moment to one summary", async () => {
		const user = await asNewUser();
		await earn(user, "first-session", "streak-3");

		await fold(user, "joined");
		await fold(user, "first-session");

		const ids = (await unseenOf(user)).map((a) => a.achievementId);
		expect(ids).toEqual(["streak-3"]);
		const summary = await summaryOf(user);
		expect(summary?.badges).toBe(2);
		expect(summary?.firstSight).toBe(true);
	});

	it("leaves a badge the moment already showed alone", async () => {
		const user = await asNewUser();
		const shown = await unseenOf(user);
		await user.t.mutation(api.achievements.unlock.markSeen, {
			ids: shown.map((a) => a.id),
		});

		await fold(user, "joined");

		expect(await summaryOf(user)).toBeNull();
	});

	it("doesn't call it first sight for someone who has seen a badge", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.achievements.unlock.markSeen, {
			ids: (await unseenOf(user)).map((a) => a.id),
		});
		await earn(user, "first-session");

		await fold(user, "first-session");

		expect((await summaryOf(user))?.firstSight).toBe(false);
	});

	it("is dismissed by the summary's own stamp", async () => {
		const user = await asNewUser();
		await fold(user, "joined");
		const summary = await summaryOf(user);

		await user.t.mutation(api.achievements.firstSight.markSeen, {
			ids: summary?.ids ?? [],
		});

		expect(await summaryOf(user)).toBeNull();
		expect(await unseenOf(user)).toEqual([]);
	});

	it("does nothing for a profile that no longer holds the badge", async () => {
		const user = await asNewUser();

		await expect(fold(user, "first-session")).resolves.toBeNull();

		expect(await summaryOf(user)).toBeNull();
	});
});
