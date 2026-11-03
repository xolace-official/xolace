// @vitest-environment edge-runtime
/**
 * #701: the one-off backfill. What can go wrong: an award dated by run time
 * when a source has a real date, sparks not matching the rows, a day counted
 * twice (logged and pre-log), a re-run awarding or crediting again, a backfill
 * row reaching the push or the unlock moment, or the Stream pass overriding a
 * live award or awarding on a failed call.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { backfillProfile } from "./backfill";

vi.mock("../lib/aggregates", () => aggregatesMock());

const firstStreamMessageAt =
	vi.fn<(channelId: string, userId: string) => Promise<number | null>>();
vi.mock("../integrations/stream", async (orig) => ({
	...(await orig<typeof import("../integrations/stream")>()),
	firstStreamMessageAt: (channelId: string, userId: string) =>
		firstStreamMessageAt(channelId, userId),
}));

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 1, 12); // noon UTC; test users have no timezone → UTC
const ago = (days: number) => NOW - days * DAY;

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	firstStreamMessageAt.mockReset();
});
afterEach(() => vi.useRealTimers());

/** A profile from before achievements: no rows, no counters, not stamped. */
async function existingUser(n = 1, root?: SeededUser["root"]) {
	const user = await asNewUser(n, root);
	await user.root.run(async (ctx) => {
		const rows = await ctx.db
			.query("user_achievements")
			.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect();
		for (const row of rows) {
			await ctx.db.delete("user_achievements", row._id);
		}
		await ctx.db.patch("emotional_profiles", user.profileId, {
			achievementPushCheck: undefined,
			achievementsBackfilledAt: undefined,
			createdAt: ago(60),
			sparkBalance: undefined,
			sparksEarned: undefined,
		});
	});
	return user;
}

const profile = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db.get("emotional_profiles", user.profileId)
	) as Promise<Doc<"emotional_profiles">>;

const backfill = (user: SeededUser) =>
	user.root.run(async (ctx) => {
		const doc = await ctx.db.get("emotional_profiles", user.profileId);
		if (doc) {
			await backfillProfile(ctx, doc);
		}
	});

const rows = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("user_achievements")
			.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);
const row = async (user: SeededUser, achievementId: string) =>
	(await rows(user)).find((r) => r.achievementId === achievementId);

const completedSession = (user: SeededUser, completedAt: number) =>
	user.root.run((ctx) =>
		ctx.db.insert("sessions", {
			completedAt,
			createdAt: completedAt,
			emotionalProfileId: user.profileId,
			entryType: "open_prompt",
			kept: true,
			state: "completed",
			updatedAt: completedAt,
		})
	);

const logged = (
	user: SeededUser,
	dayKey: string,
	createdAt: number,
	actionType: Doc<"activity_log">["actionType"] = "reflect"
) =>
	user.root.run((ctx) =>
		ctx.db.insert("activity_log", {
			actionType,
			count: 1,
			createdAt,
			dayKey,
			emotionalProfileId: user.profileId,
			updatedAt: createdAt,
		})
	);

async function finishedReads(user: SeededUser, finishedAt: number[]) {
	await user.root.run(async (ctx) => {
		for (const [i, at] of finishedAt.entries()) {
			const entryId = await ctx.db.insert("library_entries", {
				active: true,
				dek: "d",
				kind: "advice",
				lastReviewedAt: 1,
				primarySubject: "anxiety",
				readMin: 4,
				reuse: "original",
				slug: `piece-${i}`,
				title: "t",
			});
			await ctx.db.insert("library_reads", {
				emotionalProfileId: user.profileId,
				entryId,
				finishedAt: at,
				helped: false,
				lastReadAt: at,
				saved: false,
			});
		}
	});
}

describe("backfillProfile", () => {
	it("dates each award from its source, as quiet backfill rows", async () => {
		const user = await existingUser();
		await completedSession(user, ago(40));
		await completedSession(user, ago(30));
		await finishedReads(user, [ago(20), ago(19), ago(18), ago(17), ago(16)]);

		await backfill(user);

		expect((await row(user, "joined"))?.earnedAt).toBe(ago(60));
		expect((await row(user, "first-session"))?.earnedAt).toBe(ago(40));
		expect((await row(user, "first-read"))?.earnedAt).toBe(ago(20));
		expect((await row(user, "read-5"))?.earnedAt).toBe(ago(16));
		for (const r of await rows(user)) {
			expect(r).toMatchObject({ source: "backfill" });
			expect(r.seenAt).toBeUndefined();
			expect(r.pushedAt).toBeUndefined();
		}
		// Never a push check, and never in the unlock moment.
		expect((await profile(user)).achievementPushCheck).toBeUndefined();
		expect(await user.t.query(api.achievements.unlock.unseen, {})).toEqual([]);
	});

	it("credits both spark counters with exactly what the rows carry", async () => {
		const user = await existingUser();
		await completedSession(user, ago(10));
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, { longestStreak: 7 })
		);

		await backfill(user);

		const total = (await rows(user)).reduce((sum, r) => sum + r.sparks, 0);
		expect(total).toBeGreaterThan(0);
		expect(await profile(user)).toMatchObject({
			sparkBalance: total,
			sparksEarned: total,
		});
	});

	it("awards every streak rung the best streak reached, dated by run time", async () => {
		const user = await existingUser();
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				currentStreak: 2,
				longestStreak: 7,
			})
		);

		await backfill(user);

		const streak = (await rows(user)).filter((r) =>
			r.achievementId.startsWith("streak-")
		);
		expect(streak.map((r) => r.achievementId).sort()).toEqual([
			"streak-3",
			"streak-5",
			"streak-7",
		]);
		expect(streak.every((r) => r.earnedAt === NOW)).toBe(true);
	});

	it("counts logged days by their dayKey and pre-log sessions once each", async () => {
		const user = await existingUser();
		// The user has since moved from UTC to Tokyo (UTC+9).
		await user.root.run(async (ctx) => {
			const prefs = await ctx.db
				.query("preferences")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			if (prefs) {
				await ctx.db.patch("preferences", prefs._id, {
					notifications: { ...prefs.notifications, timezone: "Asia/Tokyo" },
				});
			}
		});
		// Pre-log, bucketed in Tokyo: two sessions on 08-01, one on 08-02.
		await completedSession(user, Date.UTC(2026, 7, 1, 1));
		await completedSession(user, Date.UTC(2026, 7, 1, 5));
		await completedSession(user, Date.UTC(2026, 7, 2, 1));
		// Logged in UTC: two days, plus a quotes-only day that doesn't count.
		await logged(user, "2026-08-10", Date.UTC(2026, 7, 10, 9));
		await logged(user, "2026-08-11", Date.UTC(2026, 7, 11, 23, 30));
		await logged(user, "2026-08-12", Date.UTC(2026, 7, 12, 9), "quotes");
		// The logged 08-11 session: 08-12 in Tokyo, but its day is the logged one.
		await completedSession(user, Date.UTC(2026, 7, 11, 23, 30));

		await backfill(user);

		expect((await profile(user)).daysShowedUp).toBe(4);
	});

	it("never lowers a daysShowedUp live counting already raised", async () => {
		const user = await existingUser();
		await completedSession(user, ago(5));
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, { daysShowedUp: 6 })
		);

		await backfill(user);

		expect((await profile(user)).daysShowedUp).toBe(6);
		// The rung it reaches has no day to date it by past the one known day.
		expect((await row(user, "showing-up-5"))?.earnedAt).toBe(NOW);
	});

	it("stamps the profile, and a re-run changes nothing", async () => {
		const user = await existingUser();
		await completedSession(user, ago(10));
		await backfill(user);
		const stamped = await profile(user);
		const before = await rows(user);
		expect(stamped.achievementsBackfilledAt).toBe(NOW);

		// New history after the stamp is live counting's, not the backfill's.
		await finishedReads(user, [ago(1)]);
		vi.setSystemTime(NOW + DAY);
		await backfill(user);

		expect(await rows(user)).toEqual(before);
		expect(await profile(user)).toMatchObject({
			achievementsBackfilledAt: stamped.achievementsBackfilledAt,
			sparkBalance: stamped.sparkBalance,
			sparksEarned: stamped.sparksEarned,
		});
	});

	it("leaves a live row alone and credits nothing for it", async () => {
		const user = await existingUser();
		await completedSession(user, ago(10));
		await user.root.run((ctx) =>
			ctx.db.insert("user_achievements", {
				achievementId: "first-session",
				earnedAt: ago(2),
				emotionalProfileId: user.profileId,
				source: "live",
				sparks: 10,
			})
		);

		await backfill(user);

		expect(await row(user, "first-session")).toMatchObject({
			earnedAt: ago(2),
			source: "live",
		});
		const backfilled = (await rows(user)).filter(
			(r) => r.source === "backfill"
		);
		expect((await profile(user)).sparksEarned).toBe(
			backfilled.reduce((sum, r) => sum + r.sparks, 0)
		);
	});
});

describe("backfillXolacerChats", () => {
	/** An accepted conversation with a Stream channel, seeker `user`. */
	const accepted = (
		user: SeededUser,
		xolacerProfileId: Id<"emotional_profiles">,
		channel: string
	) =>
		user.root.run((ctx) =>
			ctx.db.insert("xolacer_conversations", {
				acceptedAt: ago(20),
				requestedAt: ago(21),
				status: "open",
				streamChannelId: channel,
				userProfileId: user.profileId,
				xolacerProfileId,
			})
		);
	const run = (user: SeededUser) =>
		user.root.action(internal.achievements.backfill.backfillXolacerChats, {});

	it("awards it dated by the seeker's first message, the earliest across chats", async () => {
		const seeker = await existingUser(1);
		const xolacer = await existingUser(2, seeker.root);
		await accepted(seeker, xolacer.profileId, "chan-a");
		await accepted(seeker, xolacer.profileId, "chan-b");
		firstStreamMessageAt.mockImplementation(async (channel) =>
			channel === "chan-a" ? ago(15) : ago(18)
		);

		await run(seeker);

		expect(await row(seeker, "first-xolacer-chat")).toMatchObject({
			earnedAt: ago(18),
			source: "backfill",
		});
		expect(firstStreamMessageAt).toHaveBeenCalledWith(
			"chan-a",
			seeker.profileId
		);
	});

	it("skips a seeker who earned it live, and awards nothing on a failed call or no message", async () => {
		const live = await existingUser(1);
		const failed = await existingUser(2, live.root);
		const silent = await existingUser(3, live.root);
		await live.root.run((ctx) =>
			ctx.db.insert("user_achievements", {
				achievementId: "first-xolacer-chat",
				earnedAt: ago(1),
				emotionalProfileId: live.profileId,
				source: "live",
				sparks: 10,
			})
		);
		await accepted(live, failed.profileId, "chan-live");
		await accepted(failed, live.profileId, "chan-failed");
		await accepted(silent, live.profileId, "chan-silent");
		firstStreamMessageAt.mockImplementation(async (channel) => {
			if (channel === "chan-failed") {
				throw new Error("Stream down");
			}
			return channel === "chan-silent" ? null : ago(30);
		});
		vi.spyOn(console, "warn").mockImplementation(() => undefined);

		await run(live);

		expect(firstStreamMessageAt).not.toHaveBeenCalledWith(
			"chan-live",
			expect.anything()
		);
		expect(await row(live, "first-xolacer-chat")).toMatchObject({
			earnedAt: ago(1),
			source: "live",
		});
		expect(await row(failed, "first-xolacer-chat")).toBeUndefined();
		expect(await row(silent, "first-xolacer-chat")).toBeUndefined();
	});
});
