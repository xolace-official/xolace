// @vitest-environment edge-runtime
/**
 * #439, #700: streak milestones. Badge pushes replaced their push, so what can
 * go wrong now: a milestone still pushes on its own, a milestone day with no
 * badge rung (400) pushes anything, savers stop earning, or the copy the
 * 7/30/100 badges carry drifts.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, noopJob, revenuecatMock } from "../test/mocks.helpers";
import { localDayKey } from "./activityLog";
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
		actionType: "vent",
		emotionalProfileId: user.profileId,
		timestamp: at(day),
	});
const recordDays = async (user: SeededUser, from: number, to: number) => {
	for (let d = from; d < to; d++) {
		await record(user, d);
	}
};
const setPrefs = (
	user: SeededUser,
	notifications: Partial<Doc<"preferences">["notifications"]>
) =>
	user.root.run(async (ctx) => {
		const p = (await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique())!;
		await ctx.db.patch("preferences", p._id, {
			notifications: { ...p.notifications, ...notifications },
		});
	});
const savers = async (user: SeededUser) =>
	(
		await user.root.run((ctx) =>
			ctx.db.get("emotional_profiles", user.profileId)
		)
	)?.streakSavers;
/** Badge-push checks ever scheduled for this backend. */
const badgeChecks = (user: SeededUser) =>
	user.root.run(
		async (ctx) =>
			(await ctx.db.system.query("_scheduled_functions").collect()).filter(
				(f) => f.name.includes("achievements/push")
			).length
	);
const scheduledPushes = (user: SeededUser) =>
	user.root.run(async (ctx) =>
		(await ctx.db.system.query("_scheduled_functions").collect())
			.map((f) => f.args[0] as { type?: string; content?: string })
			.filter((a) => a.type === "streak_milestone")
			.map((a) => a.content)
	);

describe("streakMilestoneCopy (#439)", () => {
	it("uses the fixed copy for 7/30/100 and the count past that", () => {
		expect(streakMilestoneCopy(7)).toBe(
			"7 days by the fire. The flame's holding steady."
		);
		expect(streakMilestoneCopy(30)).toBe("30 days. This is a rhythm now.");
		expect(streakMilestoneCopy(100)).toBe(
			"100 days. The fire hasn't gone out once — not because you didn't stumble, but because you came back."
		);
		expect(streakMilestoneCopy(200)).toBe("200 days. Still here.");
		expect(streakMilestoneCopy(1300)).toBe("1300 days. Still here.");
	});
});

describe("streak milestones after badge pushes (#700)", () => {
	it("never push on their own: savers still earn, silently", async () => {
		const user = await asNewUser();
		await setPrefs(user, { enabled: true, milestone: true });
		await recordDays(user, 0, 7);
		expect(await scheduledPushes(user)).toEqual([]);
		expect(await savers(user)).toBe(1);
	});

	it("a 400-day streak day with no rung sends nothing", async () => {
		const user = await asNewUser();
		await setPrefs(user, { enabled: true, milestone: true });
		await user.root.run(async (ctx) => {
			await ctx.db.patch("emotional_profiles", user.profileId, {
				currentStreak: 399,
				longestStreak: 399,
				streakSavers: 0,
			});
			await ctx.db.insert("activity_log", {
				actionType: "library",
				count: 1,
				createdAt: at(0),
				dayKey: localDayKey(at(0), "UTC"),
				emotionalProfileId: user.profileId,
				updatedAt: at(0),
			});
		});
		const checksBefore = await badgeChecks(user);

		await user.t.mutation(internal.streaks.manual.recordActivityManual, {
			actionType: "library",
			emotionalProfileId: user.profileId,
			timestamp: at(1),
		});

		const profile = await user.root.run((ctx) =>
			ctx.db.get("emotional_profiles", user.profileId)
		);
		expect(profile?.currentStreak).toBe(400);
		expect(profile?.streakSavers).toBe(1);
		expect(await scheduledPushes(user)).toEqual([]);
		expect(await badgeChecks(user)).toBe(checksBefore);
	});
});
