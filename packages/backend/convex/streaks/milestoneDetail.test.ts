// @vitest-environment edge-runtime
/**
 * B14: a streak milestone's badge remembers what that day added (a saver, a
 * freeze, or nothing) and its week, and `unlock.unseen` serves both, so the
 * arrival's card and week strip say what really happened. Driven through
 * recordActivity, day by day, as the ladder tests are.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 5, 12); // noon UTC; test users have no timezone → UTC
const at = (day: number) => BASE + day * DAY;
const SEVENTH = "2026-01-11"; // day 6: the seventh day of a run from day 0

const record = (user: SeededUser, day: number) =>
	user.t.mutation(internal.streaks.manual.recordActivityManual, {
		actionType: "sit_with_this",
		emotionalProfileId: user.profileId,
		timestamp: at(day),
	});
const recordDays = async (user: SeededUser, days: number[]) => {
	for (const d of days) {
		await record(user, d);
	}
};
const holding = (user: SeededUser, patch: Partial<Doc<"emotional_profiles">>) =>
	user.root.run((ctx) =>
		ctx.db.patch("emotional_profiles", user.profileId, patch)
	);
const unseen = (user: SeededUser) =>
	user.t.query(api.achievements.unlock.unseen, {});
const milestoneOf = async (user: SeededUser, achievementId: string) =>
	(await unseen(user)).find((b) => b.achievementId === achievementId)
		?.milestone;

const ALL_SHOWED_UP = [true, true, true, true, true, true, true];

describe("a streak milestone's details on unlock.unseen", () => {
	it("says a saver when the day added one, with the week it lit", async () => {
		const user = await asNewUser();
		await recordDays(user, [0, 1, 2, 3, 4, 5, 6]);

		expect(await milestoneOf(user, "streak-7")).toEqual({
			added: "saver",
			dayKey: SEVENTH,
			week: ALL_SHOWED_UP,
		});
	});

	it("says a freeze when savers were full but seven in a row added a freeze", async () => {
		const user = await asNewUser();
		await holding(user, { streakSavers: 1 });
		await recordDays(user, [0, 1, 2, 3, 4, 5, 6]);

		expect(await milestoneOf(user, "streak-7")).toEqual({
			added: "freeze",
			dayKey: SEVENTH,
			week: ALL_SHOWED_UP,
		});
	});

	it("says nothing when savers and freezes were both full", async () => {
		const user = await asNewUser();
		await holding(user, { streakFreezes: 2, streakSavers: 1 });
		await recordDays(user, [0, 1, 2, 3, 4, 5, 6]);

		expect((await milestoneOf(user, "streak-7"))?.added).toBe("nothing");
	});

	it("leaves a day a freeze kept unlit in the week", async () => {
		const user = await asNewUser();
		await holding(user, { streakFreezes: 1 });
		// Day 4 missed and bridged by the freeze: day 7 is the seventh day showed up.
		await recordDays(user, [0, 1, 2, 3, 5, 6, 7]);

		expect(await milestoneOf(user, "streak-7")).toEqual({
			added: "saver",
			dayKey: "2026-01-12",
			week: [true, true, true, false, true, true, true],
		});
	});

	it("serves when each badge was earned, and details only on the milestone", async () => {
		const user = await asNewUser();
		await recordDays(user, [0, 1, 2, 3, 4, 5, 6]);

		const streak = (await unseen(user)).filter((b) =>
			b.achievementId.startsWith("streak-")
		);
		expect(streak.map((b) => [b.achievementId, b.milestone])).toEqual([
			["streak-3", undefined],
			["streak-5", undefined],
			["streak-7", expect.objectContaining({ dayKey: SEVENTH })],
		]);
		expect(streak.map((b) => b.earnedAt)).toEqual([at(2), at(4), at(6)]);
	});

	it("adds no details when a later run reaches a milestone it already holds", async () => {
		const user = await asNewUser();
		await recordDays(user, [0, 1, 2, 3, 4, 5, 6]);
		const first = await milestoneOf(user, "streak-7");
		// Broken, then seven more: the saver lands again, but no new badge does.
		await recordDays(user, [9, 10, 11, 12, 13, 14, 15]);

		expect(await milestoneOf(user, "streak-7")).toEqual(first);
	});
});
