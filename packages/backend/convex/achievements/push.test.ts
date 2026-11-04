// @vitest-environment edge-runtime
/**
 * #700: badge pushes, which replace the streak-milestone push. What can go
 * wrong: a badge seen in-app still buzzes the phone; several unlocks send
 * several pushes; a second batch inside a day gets through; the quiet window
 * drops the push instead of deferring it; gentle reminders off still pushes;
 * a backfilled badge pushes; a push names sparks; a streak day with no rung
 * (400) still pushes the old milestone; a check already waiting names a
 * badge earned moments ago, while its unlock moment is still held; the push
 * lands while the user is in the app, where the moment can still show; a
 * badge that folded into the summary still pushes; or a badge whose own check
 * came and went is swept into a later push, days after it was earned.
 */
import presenceTest from "@convex-dev/presence/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimiterSchema from "../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { QUIET_RETRIES } from "../lib/missedBeat";
import { streakMilestoneCopy } from "../streaks/milestones";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, noopJob, revenuecatMock } from "../test/mocks.helpers";
import { awardAchievement, FOLD_AFTER_MS } from "./award";
import { type AchievementId, findAchievement } from "./catalog";

type Sent = { notification: { title?: string; body?: string; data?: unknown } };
const sentPushes = vi.hoisted(() => [] as Sent[]);

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../lib/pushNotifications", () => ({
	sendPushToProfile: async (_ctx: unknown, args: Sent) => {
		sentPushes.push(args);
	},
}));
vi.mock("../streamSetup", async (orig) => ({
	...(await orig<typeof import("../streamSetup")>()),
	addToXolaceChannel: noopJob(),
}));

const rateLimiterModules = import.meta.glob(
	"../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts"
);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Fake timers, so the next-day check and the schedule it enqueues really run.
beforeEach(() => {
	vi.useFakeTimers();
	sentPushes.length = 0;
});
afterEach(() => vi.useRealTimers());

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

/** A new user with gentle reminders on, the Joined moment already seen. */
async function notifiable(
	notifications: Partial<Doc<"preferences">["notifications"]> = {}
) {
	const user = await asNewUser();
	user.root.registerComponent(
		"rateLimiter",
		rateLimiterSchema,
		rateLimiterModules
	);
	presenceTest.register(user.root);
	await setPrefs(user, { enabled: true, milestone: true, ...notifications });
	await seeAll(user);
	return user;
}

const earn = (user: SeededUser, ...ids: AchievementId[]) =>
	user.root.run(async (ctx) => {
		for (const id of ids) {
			await awardAchievement(ctx, user.profileId, id);
		}
	});

/** The unlock sheet showed everything waiting. */
async function seeAll(user: SeededUser) {
	const unseen = await user.t.query(api.achievements.unlock.unseen, {});
	await user.t.mutation(api.achievements.unlock.markSeen, {
		ids: unseen.map((a) => a.id),
	});
}

const logs = (user: SeededUser) =>
	user.root.run((ctx) => ctx.db.query("notification_log").take(10));

const pendingChecks = (user: SeededUser) =>
	user.root.run(
		async (ctx) =>
			(await ctx.db.system.query("_scheduled_functions").collect()).filter(
				(f) =>
					f.name.includes("achievements/push") && f.state.kind === "pending"
			).length
	);

const pushes = () =>
	sentPushes.map(({ notification: { title, body } }) => ({ body, title }));

/** Moves the clock, then runs what came due and what that enqueued. */
async function advance(user: SeededUser, ms: number) {
	vi.advanceTimersByTime(ms);
	await user.root.finishInProgressScheduledFunctions();
	vi.advanceTimersByTime(1);
	await user.root.finishInProgressScheduledFunctions();
}

const stampedPushed = (user: SeededUser, achievementId: AchievementId) =>
	user.root.run(async (ctx) => {
		const row = await ctx.db
			.query("user_achievements")
			.withIndex("by_emotionalProfileId_and_achievementId", (q) =>
				q
					.eq("emotionalProfileId", user.profileId)
					.eq("achievementId", achievementId)
			)
			.unique();
		return row?.pushedAt !== undefined;
	});

/**
 * Past a check with no usual hour, which lands this time tomorrow. Not
 * `runAllTimers`: that also fires the week-out fold, and every job then runs
 * with the clock at the end of that week.
 */
const nextDay = (user: SeededUser) => advance(user, 25 * HOUR);

/** The app's heartbeat: the user has it open. */
const openApp = (user: SeededUser) =>
	user.t.mutation(api.presence.heartbeat, {
		interval: 30 * SECOND,
		roomId: "app",
		sessionId: "this-phone",
		userId: "",
	});

const FIRST_SESSION_PUSH = {
	body: "You said what was there. That's the hardest part.",
	title: "First session",
};

/** Always quiet: every hour is before 24. */
const ALWAYS_QUIET = {
	quietWindow: { dontReachAfter: 23, dontReachBefore: 24 },
	timezone: "UTC",
};

const pushOf = (id: AchievementId) => {
	const badge = findAchievement(id);
	return { body: badge?.copy, title: badge?.title };
};

describe("the missed-badge push (#700)", () => {
	it("names the one badge that went unseen, the next day", async () => {
		const user = await notifiable();
		const earnedAt = Date.now();
		await earn(user, "first-session");
		await nextDay(user);
		expect(pushes()).toEqual([
			{
				body: "You said what was there. That's the hardest part.",
				title: "First session",
			},
		]);
		expect(sentPushes[0]?.notification.data).toMatchObject({
			type: "achievement",
		});
		expect(Date.now() - earnedAt).toBeGreaterThanOrEqual(12 * HOUR);
	});

	it("stays silent once the unlock moment showed it", async () => {
		const user = await notifiable();
		await earn(user, "first-session");
		await seeAll(user);
		await nextDay(user);
		expect(sentPushes).toEqual([]);
		expect(await logs(user)).toEqual([]);
	});

	it("batches unseen unlocks into one push, then caps the day", async () => {
		vi.setSystemTime(Date.UTC(2026, 10, 3, 8));
		const user = await notifiable();
		await earn(user, "first-session");
		vi.advanceTimersByTime(HOUR); // one check covers a later unlock too
		await earn(user, "first-listen");
		await advance(user, 23 * HOUR); // 08:00 tomorrow
		expect(pushes()).toEqual([
			{ body: "You earned 2 badges.", title: "Xolace" },
		]);

		// A third just after: with a 21:00 UTC usual hour its check lands at
		// 21:00 today, 13h after the first push.
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				typicalUsagePattern: { dayOfWeek: 3, hourOfDay: 21 },
			})
		);
		vi.advanceTimersByTime(HOUR / 2);
		await earn(user, "sat-with-it");
		await advance(user, 13 * HOUR);
		expect(sentPushes).toHaveLength(1);
		expect((await logs(user)).map((l) => l.suppressedReason)).toEqual([
			undefined,
			"rate_limit",
		]);
	});

	it("pushes once, then folds what stays unseen into the summary", async () => {
		const user = await notifiable();
		await earn(user, "first-session");

		await nextDay(user);
		expect(sentPushes).toHaveLength(1);

		await advance(user, FOLD_AFTER_MS);
		expect(sentPushes).toHaveLength(1);
		expect(await user.t.query(api.achievements.unlock.unseen, {})).toEqual([]);
		const summary = await user.t.query(api.achievements.firstSight.summary, {});
		expect(summary).toMatchObject({ badges: 1, firstSight: false });
	});

	it("never pushes a badge that folded before its check", async () => {
		const user = await notifiable({ enabled: false });
		await earn(user, "first-session");
		await advance(user, FOLD_AFTER_MS);

		await setPrefs(user, { enabled: true });
		await earn(user, "first-listen");
		await nextDay(user);

		expect(pushes()).toEqual([pushOf("first-listen")]);
	});

	it("carries the streak-milestone copy on the 7, 30 and 100 rungs", async () => {
		for (const days of [7, 30, 100]) {
			sentPushes.length = 0;
			const user = await notifiable();
			await earn(user, `streak-${days}`);
			await nextDay(user);
			expect(pushes()).toEqual([
				{ body: streakMilestoneCopy(days), title: `${days} days by the fire` },
			]);
		}
	});

	it("never names sparks", async () => {
		const user = await notifiable();
		await earn(user, "first-session");
		await nextDay(user);
		expect(JSON.stringify(sentPushes)).not.toMatch(/spark/i);
	});

	it("never pushes a backfilled badge", async () => {
		const user = await notifiable();
		await user.root.run(async (ctx) => {
			await ctx.db.insert("user_achievements", {
				achievementId: "streak-3",
				earnedAt: Date.now(),
				emotionalProfileId: user.profileId,
				source: "backfill",
				sparks: 10,
			});
		});
		await earn(user, "first-session");
		await nextDay(user);
		expect(pushes()).toEqual([
			{
				body: "You said what was there. That's the hardest part.",
				title: "First session",
			},
		]);
	});

	it("stays silent with notifications or gentle reminders off", async () => {
		for (const off of [{ enabled: false }, { milestone: false }]) {
			const user = await notifiable(off);
			await earn(user, "first-session");
			await nextDay(user);
		}
		expect(sentPushes).toEqual([]);
	});

	it("lets the achievement flag override gentle reminders", async () => {
		const off = await notifiable({ achievement: false });
		await earn(off, "first-session");
		await nextDay(off);
		expect(sentPushes).toEqual([]);

		const on = await notifiable({ achievement: true, milestone: false });
		await earn(on, "first-session");
		await nextDay(on);
		expect(sentPushes).toHaveLength(1);
	});

	it("waits out the quiet window instead of dropping the push", async () => {
		const user = await notifiable({
			// Every hour is before 24: always quiet.
			quietWindow: { dontReachAfter: 23, dontReachBefore: 24 },
			timezone: "UTC",
		});
		await earn(user, "first-session");
		vi.advanceTimersByTime(37 * HOUR); // past the check: quiet, so it re-checks hourly
		await user.root.finishInProgressScheduledFunctions();
		expect(sentPushes).toEqual([]);
		await setPrefs(user, { quietWindow: undefined });
		await nextDay(user);
		expect(sentPushes).toHaveLength(1);
	});

	it("schedules one check per profile however many unlocks land", async () => {
		const user = await notifiable();
		await earn(user, "first-session", "first-listen", "sat-with-it");
		expect(await pendingChecks(user)).toBe(1);
		await nextDay(user);
		await earn(user, "first-talk");
		expect(await pendingChecks(user)).toBe(1);
	});

	describe("a check already waiting, and a badge earned just before it", () => {
		// `notifiable` saw Joined, whose check still lands 24h after signup.
		const justBeforeTheCheck = 24 * HOUR - 5 * MINUTE;
		const pastTheCheck = 6 * MINUTE;

		it("leaves it to the unlock moment, and pushes it the next day if missed", async () => {
			const user = await notifiable();
			vi.advanceTimersByTime(justBeforeTheCheck);
			const earnedAt = Date.now();
			await earn(user, "first-session");

			await advance(user, pastTheCheck);
			expect(sentPushes).toEqual([]);
			expect(await stampedPushed(user, "first-session")).toBe(false);
			expect(await pendingChecks(user)).toBe(1);

			await nextDay(user);
			expect(pushes()).toEqual([FIRST_SESSION_PUSH]);
			expect(Date.now() - earnedAt).toBeGreaterThanOrEqual(12 * HOUR);
		});

		it("stays silent if the held moment then shows it", async () => {
			const user = await notifiable();
			vi.advanceTimersByTime(justBeforeTheCheck);
			await earn(user, "first-session");
			await advance(user, pastTheCheck);

			await seeAll(user);
			await nextDay(user);
			expect(sentPushes).toEqual([]);
		});

		it("pushes the badge that waited a day and holds back the new one", async () => {
			const user = await notifiable();
			await earn(user, "first-session");
			vi.advanceTimersByTime(justBeforeTheCheck);
			await earn(user, "first-listen");

			await advance(user, pastTheCheck);
			expect(pushes()).toEqual([FIRST_SESSION_PUSH]);
			expect(await stampedPushed(user, "first-session")).toBe(true);
			expect(await stampedPushed(user, "first-listen")).toBe(false);
			expect(await pendingChecks(user)).toBe(1);
		});

		it("gives it the next day even through the quiet window's retries", async () => {
			const user = await notifiable({
				quietWindow: { dontReachAfter: 23, dontReachBefore: 24 },
				timezone: "UTC",
			});
			vi.advanceTimersByTime(justBeforeTheCheck);
			await earn(user, "first-session");
			await advance(user, pastTheCheck);

			// An hourly retry would push it here, well short of a day.
			await setPrefs(user, { quietWindow: undefined });
			await advance(user, 2 * HOUR);
			expect(sentPushes).toEqual([]);

			await nextDay(user);
			expect(pushes()).toEqual([FIRST_SESSION_PUSH]);
		});
	});

	describe("a badge whose own check came and went", () => {
		it("isn't swept into the push after notifications come back on", async () => {
			const user = await notifiable({ enabled: false });
			await earn(user, "first-session");
			await advance(user, 25 * HOUR); // Its check: not allowed, so no push.

			await advance(user, 4 * DAY);
			await setPrefs(user, { enabled: true });
			await earn(user, "first-listen");
			await advance(user, 25 * HOUR);

			expect(pushes()).toEqual([pushOf("first-listen")]);
			// The push let it go; the moment hasn't.
			const unseen = await user.t.query(api.achievements.unlock.unseen, {});
			expect(unseen.map((a) => a.achievementId)).toContain("first-session");
		});

		it("isn't swept in after the quiet window outlasts its retries", async () => {
			const user = await notifiable(ALWAYS_QUIET);
			await earn(user, "first-session");
			await advance(user, 25 * HOUR);
			for (let retry = 0; retry < QUIET_RETRIES; retry++) {
				await advance(user, HOUR);
			}
			expect(await pendingChecks(user)).toBe(0);

			await setPrefs(user, { quietWindow: undefined });
			await advance(user, 2 * DAY);
			await earn(user, "first-listen");
			await advance(user, 25 * HOUR);

			expect(pushes()).toEqual([pushOf("first-listen")]);
		});

		it("still pushes on the last retry of the latest check", async () => {
			vi.setSystemTime(Date.UTC(2026, 10, 3, 12));
			const user = await notifiable(ALWAYS_QUIET);
			await advance(user, 25 * HOUR); // Past Joined's check, so ours is fresh.
			await user.root.run((ctx) =>
				ctx.db.patch("emotional_profiles", user.profileId, {
					typicalUsagePattern: { dayOfWeek: 3, hourOfDay: 12 },
				})
			);
			// 12:00 tomorrow is the far end of the 12-36h a check can wait, less a
			// minute: earning at 00:01 lands it 35h59m out at the latest.
			vi.setSystemTime(Date.UTC(2026, 10, 5, 0, 1));
			await earn(user, "first-session");
			await advance(user, 36 * HOUR);
			for (let retry = 0; retry < QUIET_RETRIES - 1; retry++) {
				await advance(user, HOUR);
			}
			expect(sentPushes).toEqual([]);

			await setPrefs(user, { quietWindow: undefined });
			await advance(user, HOUR);
			expect(pushes()).toEqual([FIRST_SESSION_PUSH]);
		});
	});

	describe("while the user is in the app", () => {
		// The check lands 24h after `notifiable`; 5s either side of it.
		const justBeforeTheCheck = 24 * HOUR - 5 * SECOND;
		const pastTheCheck = 10 * SECOND;

		it("holds the push, and sends it once they've left", async () => {
			const user = await notifiable();
			await earn(user, "first-session");
			vi.advanceTimersByTime(justBeforeTheCheck);
			const { sessionToken } = await openApp(user);

			await advance(user, pastTheCheck);
			expect(sentPushes).toEqual([]);
			expect(await stampedPushed(user, "first-session")).toBe(false);
			expect(await pendingChecks(user)).toBe(1);

			await user.t.mutation(api.presence.disconnect, { sessionToken });
			await advance(user, HOUR);
			expect(pushes()).toEqual([FIRST_SESSION_PUSH]);
		});

		it("stays silent if the moment shows it before they leave", async () => {
			const user = await notifiable();
			await earn(user, "first-session");
			vi.advanceTimersByTime(justBeforeTheCheck);
			await openApp(user);
			await advance(user, pastTheCheck);

			await seeAll(user);
			await nextDay(user);
			expect(sentPushes).toEqual([]);
		});

		it("doesn't wait on a client that dropped without saying so", async () => {
			const user = await notifiable();
			await earn(user, "first-session");
			// Past the component's timeout (2.5 heartbeats) by the check.
			vi.advanceTimersByTime(24 * HOUR - 5 * MINUTE);
			await openApp(user);

			await advance(user, 6 * MINUTE);
			expect(pushes()).toEqual([FIRST_SESSION_PUSH]);
		});
	});
});
