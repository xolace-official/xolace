// @vitest-environment edge-runtime
/**
 * #699: pinning earned badges to the profile's row. What can go wrong: a pin
 * lands on a badge never earned, a 4th pin silently replaces one, the row
 * shows a badge twice or pins out of the order they were pinned in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { expectCode } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { awardAchievement } from "./award";
import type { AchievementId } from "./catalog";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const SECOND = 1000;

const earn = (user: SeededUser, ...ids: AchievementId[]) =>
	user.root.run(async (ctx) => {
		let at = Date.now();
		for (const id of ids) {
			at += 1;
			await awardAchievement(ctx, user.profileId, id, at);
		}
	});
/** Each pin a second after the last, so their order is unambiguous. */
const pin = (user: SeededUser, achievementId: string, pinned = true) => {
	vi.advanceTimersByTime(SECOND);
	return user.t.mutation(api.achievements.pins.setPinned, {
		achievementId,
		pinned,
	});
};
const detail = (user: SeededUser, achievementId: string) =>
	user.t.query(api.achievements.display.get, { achievementId });
const row = async (user: SeededUser) =>
	(await user.t.query(api.achievements.display.shelf, {})).badges.map(
		(b) => b.achievementId
	);

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(Date.UTC(2026, 10, 3, 12));
});
afterEach(() => vi.useRealTimers());

describe("the profile row", () => {
	it("puts a pinned badge first, then the latest earned without repeating it", async () => {
		const user = await asNewUser();
		await earn(user, "first-session", "streak-3", "sat-with-it");

		await pin(user, "joined");

		expect(await row(user)).toEqual(["joined", "sat-with-it", "streak-3"]);
	});

	it("keeps pins in the order they were pinned, earliest on the left", async () => {
		const user = await asNewUser();
		await earn(user, "first-session", "streak-3", "sat-with-it");

		await pin(user, "streak-3");
		await pin(user, "joined");

		expect(await row(user)).toEqual(["streak-3", "joined", "sat-with-it"]);
	});

	it("goes back to the latest earned once unpinned", async () => {
		const user = await asNewUser();
		await earn(user, "first-session", "streak-3", "sat-with-it");
		await pin(user, "joined");

		await pin(user, "joined", false);

		expect(await row(user)).toEqual([
			"sat-with-it",
			"streak-3",
			"first-session",
		]);
	});

	it("marks the pinned badges, and only those", async () => {
		const user = await asNewUser();
		await earn(user, "first-session", "streak-3");
		await pin(user, "joined");

		const { badges } = await user.t.query(api.achievements.display.shelf, {});

		expect(badges.map((b) => [b.achievementId, b.pinned])).toEqual([
			["joined", true],
			["streak-3", false],
			["first-session", false],
		]);
	});
});

describe("setPinned", () => {
	it("refuses a 4th pin and leaves the three alone", async () => {
		const user = await asNewUser();
		await earn(user, "first-session", "streak-3", "sat-with-it");
		await pin(user, "joined");
		await pin(user, "first-session");
		await pin(user, "streak-3");

		await expectCode(() => pin(user, "sat-with-it"), "pin_limit_reached");

		expect(await row(user)).toEqual(["joined", "first-session", "streak-3"]);
		expect((await detail(user, "sat-with-it"))?.pinned).toBe(false);
	});

	it("refuses a badge not earned yet", async () => {
		const user = await asNewUser();

		await expectCode(() => pin(user, "streak-3"), "not_earned");

		expect((await detail(user, "streak-3"))?.pinned).toBe(false);
	});

	it("lets only three of four pins sent at once through", async () => {
		const user = await asNewUser();
		await earn(user, "first-session", "streak-3", "sat-with-it");
		const ids = ["joined", "first-session", "streak-3", "sat-with-it"];

		const results = await Promise.allSettled(
			ids.map((achievementId) =>
				user.t.mutation(api.achievements.pins.setPinned, {
					achievementId,
					pinned: true,
				})
			)
		);

		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
		expect(results.filter((r) => r.status === "rejected")).toMatchObject([
			{ reason: { data: { code: "pin_limit_reached" } } },
		]);
		expect(await row(user)).toHaveLength(3);
	});

	it("refuses a row left on an id the catalog no longer has", async () => {
		const user = await asNewUser();
		await user.root.run((ctx) =>
			ctx.db.insert("user_achievements", {
				achievementId: "retired-badge",
				earnedAt: Date.now(),
				emotionalProfileId: user.profileId,
				source: "live",
				sparks: 10,
			})
		);

		await expectCode(() => pin(user, "retired-badge"), "not_earned");
	});

	it("keeps the first pin's place when pinned again", async () => {
		const user = await asNewUser();
		await earn(user, "first-session");
		await pin(user, "joined");
		await pin(user, "first-session");

		await pin(user, "joined");

		expect(await row(user)).toEqual(["joined", "first-session"]);
	});

	it("does nothing when unpinning a badge that isn't pinned", async () => {
		const user = await asNewUser();

		await pin(user, "joined", false);

		expect((await detail(user, "joined"))?.pinned).toBe(false);
	});

	it("shows the pin on the badge's page and on the achievements screen", async () => {
		const user = await asNewUser();

		await pin(user, "joined");

		expect((await detail(user, "joined"))?.pinned).toBe(true);
		const overview = await user.t.query(api.achievements.display.overview, {});
		const pinned = overview.categories
			.flatMap((c) => c.achievements)
			.filter((a) => a.pinned)
			.map((a) => a.achievementId);
		expect(pinned).toEqual(["joined"]);
	});

	it("only touches the caller's own badges", async () => {
		const user = await asNewUser(1);
		const other = await asNewUser(2, user.root);

		await pin(user, "joined");

		expect((await detail(other, "joined"))?.pinned).toBe(false);
	});

	it("keeps a pin through a data wipe", async () => {
		const user = await asNewUser();
		await pin(user, "joined");

		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});

		expect((await detail(user, "joined"))?.pinned).toBe(true);
	});
});
