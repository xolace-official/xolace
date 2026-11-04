import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../_generated/server";
import { firstStreamMessageAt } from "../integrations/stream";
import { ACTION_WEIGHTS, localDayKey } from "../streaks/activityLog";
import { insertAward } from "./award";
import {
	type AchievementId,
	findAchievement,
	nextStreakRungAfter,
	rungsCounting,
} from "./catalog";

/**
 * The one-off backfill (#686, #701): existing profiles quietly get what they
 * had already earned before achievements launched. Never pushed, never in the
 * unlock moment; the first-sight summary (firstSight.ts) shows it once.
 */

// Ceilings on one profile's reads. Today's counts sit far below them (sessions
// rarely pass ~110); past one, the oldest rows still count and the rest don't,
// so a count may undercount, never overcount. Sessions are whole documents
// (transcripts and all), so theirs stays well inside one transaction's reads.
const SESSION_LIMIT = 250;
const ACTIVITY_LIMIT = 5000;
const READ_LIMIT = 1000;
const CONVERSATION_LIMIT = 500;
/** Conversations per Stream pass page, one Stream search each. */
const CHAT_PAGE_SIZE = 50;

/**
 * Award one achievement from the backfill: a quiet `source: "backfill"` row,
 * crediting both spark counters alongside the insert. Unlike `awardAchievement`
 * it ignores `achievementsBackfilledAt` (it is what sets it) and never
 * schedules a push. Idempotent: a live row wins, and a quiet one only moves to
 * an earlier date. An award from before the stamp is dated when it landed, which
 * for a "first" can be long after the real one.
 */
async function awardBackfilled(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	achievementId: AchievementId,
	earnedAt: number
): Promise<void> {
	const held = await ctx.db
		.query("user_achievements")
		.withIndex("by_emotionalProfileId_and_achievementId", (q) =>
			q
				.eq("emotionalProfileId", emotionalProfileId)
				.eq("achievementId", achievementId)
		)
		.unique();
	if (held) {
		if (held.source === "backfill" && earnedAt < held.earnedAt) {
			await ctx.db.patch("user_achievements", held._id, { earnedAt });
		}
		return;
	}
	const achievement = findAchievement(achievementId);
	const profile = await ctx.db.get("emotional_profiles", emotionalProfileId);
	if (achievement && profile) {
		await insertAward(ctx, profile, achievement, {
			achievementId,
			earnedAt,
			source: "backfill",
		});
	}
}

type Award = { achievementId: AchievementId; earnedAt: number };

/** The earliest of some timestamps, skipping the missing ones. */
function earliest(times: readonly (number | undefined)[]): number | undefined {
	const known = times.filter((t) => t !== undefined);
	return known.length > 0 ? Math.min(...known) : undefined;
}

/**
 * Backfill one profile in its own transaction: read every source in the
 * decision's table (#686), award what they show with real dates where a source
 * has one (run time otherwise), seed `daysShowedUp`, then stamp
 * `achievementsBackfilledAt` so awards go live. Skips a stamped profile.
 * First listen comes only from logged listens (logging and its award shipped
 * together, so earlier listens left nothing); First Xolacer chat needs Stream
 * (`backfillXolacerChats`).
 */
export async function backfillProfile(
	ctx: MutationCtx,
	profile: Doc<"emotional_profiles">
): Promise<void> {
	if (profile.achievementsBackfilledAt !== undefined) {
		return;
	}
	const now = Date.now();
	const profileId = profile._id;

	const preferences = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
		.unique();
	const timezone = preferences?.notifications.timezone ?? "UTC";
	const sessions = await ctx.db
		.query("sessions")
		.withIndex("by_profile_state", (q) =>
			q.eq("emotionalProfileId", profileId).eq("state", "completed")
		)
		.take(SESSION_LIMIT);
	const activity = await ctx.db
		.query("activity_log")
		.withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.take(ACTIVITY_LIMIT);
	// Oldest finish first: the Nth row is when the Nth piece was read.
	const reads = await ctx.db
		.query("library_reads")
		.withIndex("by_emotionalProfileId_and_finishedAt_and_lastReadAt", (q) =>
			q.eq("emotionalProfileId", profileId).gt("finishedAt", 0)
		)
		.take(READ_LIMIT);
	// Saves later unsaved are gone; the earliest kept one stands in.
	const firstSaved = await ctx.db
		.query("daily_quotes")
		.withIndex("by_profile_saved", (q) =>
			q.eq("emotionalProfileId", profileId).gt("savedAt", 0)
		)
		.first();
	const finishedKindling = await ctx.db
		.query("paths")
		.withIndex("by_profile_and_status", (q) =>
			q.eq("emotionalProfileId", profileId).eq("status", "completed")
		)
		.first();
	// `requestedAt` is overwritten by a re-request; creation is the first ask.
	const requests = await ctx.db
		.query("xolacer_conversations")
		.withIndex("by_user_and_status", (q) => q.eq("userProfileId", profileId))
		.take(CONVERSATION_LIMIT);

	const loggedAt = (...types: Doc<"activity_log">["actionType"][]) =>
		activity
			.filter((r) => types.includes(r.actionType))
			.map((r) => r.createdAt);
	// No guessed dates: a completed session without `completedAt` dates nothing.
	const endedAt = (matches: (s: Doc<"sessions">) => unknown = () => true) =>
		sessions.filter(matches).map((s) => s.completedAt);
	const solo = endedAt(
		(s) => s.pathChosen === "solo" && s.pathCompleted && s.exerciseId
	);

	const oneOffs: [AchievementId, number | undefined][] = [
		["joined", profile.createdAt],
		[
			"first-session",
			earliest([
				...endedAt(),
				...loggedAt("reflect", "vent"),
				profile.firstSessionAt,
			]),
		],
		["first-talk", earliest(endedAt((s) => s.entryType === "talk"))],
		["first-quote", firstSaved?.savedAt],
		["sat-with-it", earliest([...solo, ...loggedAt("sit_with_this")])],
		["first-exercise", earliest(solo)],
		// No completion timestamp on a kindling.
		["first-kindling", finishedKindling ? now : undefined],
		["asked-for-chat", earliest(requests.map((r) => r._creationTime))],
		["shared-reflection", earliest(endedAt((s) => s.contributedReflection))],
		["first-listen", earliest(loggedAt("listen"))],
	];
	const awards: Award[] = oneOffs.flatMap(([achievementId, earnedAt]) =>
		earnedAt === undefined ? [] : [{ achievementId, earnedAt }]
	);

	// Streak rungs: no per-rung date survives, so they carry run time.
	const best = Math.max(profile.longestStreak ?? 0, profile.currentStreak);
	for (
		let rung = nextStreakRungAfter(0);
		rung <= best;
		rung = nextStreakRungAfter(rung)
	) {
		awards.push({ achievementId: `streak-${rung}`, earnedAt: now });
	}

	// Ladders dated by the Nth row: the Nth piece finished, the Nth area unlocked.
	const readTimes = reads.flatMap((r) =>
		r.finishedAt === undefined ? [] : [r.finishedAt]
	);
	const unlockTimes = (profile.unlockedDomains ?? [])
		.map((u) => u.at)
		.sort((a, b) => a - b);
	for (const [counter, times] of [
		["pieces_read", readTimes],
		["areas_unlocked", unlockTimes],
	] as const) {
		for (const rung of rungsCounting(counter)) {
			const earnedAt = times[rung.target - 1];
			if (earnedAt !== undefined) {
				awards.push({ achievementId: rung.achievementId, earnedAt });
			}
		}
	}

	// Days showed up: distinct local days with anything that counts, each
	// dated by its first action. Logged rows keep the dayKey they were written
	// with. Only what predates the log is bucketed, in the user's current
	// timezone: re-bucketing a logged action could make it a second day.
	const firstOfDay = new Map<string, number>();
	const showedUp = (dayKey: string, at: number) => {
		firstOfDay.set(dayKey, Math.min(at, firstOfDay.get(dayKey) ?? at));
	};
	for (const row of activity) {
		if (ACTION_WEIGHTS[row.actionType] > 0) {
			showedUp(row.dayKey, row.createdAt);
		}
	}
	const logStart =
		earliest(activity.map((r) => r.createdAt)) ?? Number.POSITIVE_INFINITY;
	for (const at of [...endedAt(), ...readTimes]) {
		if (at !== undefined && at < logStart) {
			showedUp(localDayKey(at, timezone), at);
		}
	}
	const dayStarts = [...firstOfDay]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, at]) => at);
	// Live counting has run since #694; never lower what it already holds.
	const daysShowedUp = Math.max(profile.daysShowedUp ?? 0, dayStarts.length);
	for (const rung of rungsCounting("days_showed_up")) {
		if (rung.target <= daysShowedUp) {
			awards.push({
				achievementId: rung.achievementId,
				earnedAt: dayStarts[rung.target - 1] ?? now,
			});
		}
	}

	for (const { achievementId, earnedAt } of awards) {
		await awardBackfilled(ctx, profileId, achievementId, earnedAt);
	}
	await ctx.db.patch("emotional_profiles", profileId, {
		achievementsBackfilledAt: now,
		daysShowedUp,
	});
}

// ── First Xolacer chat: a separate pass over Stream ──────────────

/**
 * One page of accepted conversations whose seeker hasn't earned First Xolacer
 * chat live. A backfilled one stays in, so a seeker's other conversations can
 * still move its date earlier. A plain table page: there's no index on
 * `acceptedAt`, and the pass runs once.
 */
export const xolacerChatPage = internalQuery({
	args: { cursor: v.union(v.string(), v.null()) },
	handler: async (ctx, { cursor }) => {
		const page = await ctx.db
			.query("xolacer_conversations")
			.paginate({ cursor, numItems: CHAT_PAGE_SIZE });
		const pending: { channelId: string; seekerId: Id<"emotional_profiles"> }[] =
			[];
		for (const conversation of page.page) {
			if (
				conversation.acceptedAt === undefined ||
				conversation.streamChannelId === undefined
			) {
				continue;
			}
			const held = await ctx.db
				.query("user_achievements")
				.withIndex("by_emotionalProfileId_and_achievementId", (q) =>
					q
						.eq("emotionalProfileId", conversation.userProfileId)
						.eq("achievementId", "first-xolacer-chat")
				)
				.unique();
			if (held?.source !== "live") {
				pending.push({
					channelId: conversation.streamChannelId,
					seekerId: conversation.userProfileId,
				});
			}
		}
		return {
			continueCursor: page.continueCursor,
			isDone: page.isDone,
			pending,
		};
	},
	returns: v.object({
		continueCursor: v.string(),
		isDone: v.boolean(),
		pending: v.array(
			v.object({
				channelId: v.string(),
				seekerId: v.id("emotional_profiles"),
			})
		),
	}),
});

/** Awards it, or moves a backfilled one to an earlier first message. */
export const awardXolacerChat = internalMutation({
	args: {
		earnedAt: v.number(),
		emotionalProfileId: v.id("emotional_profiles"),
	},
	handler: async (ctx, { earnedAt, emotionalProfileId }) => {
		await awardBackfilled(
			ctx,
			emotionalProfileId,
			"first-xolacer-chat",
			earnedAt
		);
		return null;
	},
	returns: v.null(),
});

/**
 * First Xolacer chat for existing seekers (#686): per accepted conversation,
 * asks Stream when the seeker first posted, and awards it dated then. A failed
 * call awards nothing; they earn it live. Run once after `backfillAchievements`
 * has completed; it pages itself through the table:
 *   bunx convex run achievements/backfill:backfillXolacerChats
 */
export const backfillXolacerChats = internalAction({
	args: { cursor: v.optional(v.union(v.string(), v.null())) },
	handler: async (ctx, { cursor = null }) => {
		const { continueCursor, isDone, pending } = await ctx.runQuery(
			internal.achievements.backfill.xolacerChatPage,
			{ cursor }
		);
		for (const { channelId, seekerId } of pending) {
			try {
				const earnedAt = await firstStreamMessageAt(channelId, seekerId);
				if (earnedAt !== null) {
					await ctx.runMutation(
						internal.achievements.backfill.awardXolacerChat,
						{ earnedAt, emotionalProfileId: seekerId }
					);
				}
			} catch (error) {
				console.warn("[achievements] Xolacer chat backfill skipped", error);
			}
		}
		if (!isDone) {
			await ctx.scheduler.runAfter(
				0,
				internal.achievements.backfill.backfillXolacerChats,
				{ cursor: continueCursor }
			);
		}
		return null;
	},
	returns: v.null(),
});
