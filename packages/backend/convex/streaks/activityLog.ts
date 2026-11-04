import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { awardAchievement } from "../achievements/award";
import { awardShowingUpRung, awardStreakRungs } from "../achievements/ladders";
import { isStreakMilestone } from "./milestones";
import { earnFreeze, SAVER_CAP, settleStreak } from "./state";

export type ActivityActionType = Doc<"activity_log">["actionType"];

// Weight is derived here, at read time, not stored on the row — re-weighting
// an action type later needs no backfill. `quotes` is logged but zero-weight:
// it never extends a streak on its own (decision log, #423).
export const ACTION_WEIGHTS: Record<ActivityActionType, number> = {
	daily_mood: 1,
	library: 1,
	listen: 1,
	quotes: 0,
	reflect: 1,
	sit_with_this: 1,
	vent: 1,
};

/** Does this action count toward the streak (and days showed up)? */
const countsTowardStreak = (actionType: ActivityActionType) =>
	ACTION_WEIGHTS[actionType] > 0;

/**
 * Local calendar day ("YYYY-MM-DD") for a timestamp in an IANA timezone.
 * Falls back to UTC if the timezone string is invalid (e.g. stale client data).
 */
export function localDayKey(timestampMs: number, timezone: string): string {
	try {
		return new Intl.DateTimeFormat("en-CA", {
			day: "2-digit",
			month: "2-digit",
			timeZone: timezone,
			year: "numeric",
		}).format(new Date(timestampMs));
	} catch {
		return new Intl.DateTimeFormat("en-CA", {
			day: "2-digit",
			month: "2-digit",
			timeZone: "UTC",
			year: "numeric",
		}).format(new Date(timestampMs));
	}
}

/**
 * Single write path for streak-affecting events. Upserts the (profile, local
 * day, action type) log row, then keeps the deprecated currentStreak /
 * longestStreak mirror on emotional_profiles in sync — old app binaries still
 * read those directly (Deferred Deprecations, CLAUDE.md) — and bumps
 * lastSessionAt on reflect only.
 *
 * Called directly by every qualifying action's mutation (same transaction,
 * no nested ctx.runMutation).
 */
export async function recordActivity(
	ctx: MutationCtx,
	args: {
		emotionalProfileId: Id<"emotional_profiles">;
		actionType: ActivityActionType;
		timestamp?: number;
	}
): Promise<void> {
	const profile = await ctx.db.get(
		"emotional_profiles",
		args.emotionalProfileId
	);
	if (!profile) {
		return;
	}

	const now = args.timestamp ?? Date.now();
	// Bridge any gap a freeze covers first, so an action the day after a frozen
	// day reads that day as yesterday. The last covered dayKey comes off its own
	// persisted row — never recomputed from lastSessionAt under whatever
	// timezone is active now.
	const state = await settleStreak(ctx, profile, now);
	const dayKey = localDayKey(now, state.timezone);
	const previousDayKey = state.lastCoveredDay;

	// At most one row per action type.
	const dayRows = await ctx.db
		.query("activity_log")
		.withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) =>
			q.eq("emotionalProfileId", args.emotionalProfileId).eq("dayKey", dayKey)
		)
		.collect();
	const existing = dayRows.find((r) => r.actionType === args.actionType);
	// The day's first row that counts toward the streak makes it a day showed
	// up (#694). Several actions are still one day; quotes alone never are.
	// lastShowedUpDay catches a day a data wipe emptied after it counted.
	const firstShowedUp =
		countsTowardStreak(args.actionType) &&
		!dayRows.some((r) => countsTowardStreak(r.actionType)) &&
		profile.lastShowedUpDay !== dayKey;

	if (existing) {
		await ctx.db.patch("activity_log", existing._id, {
			count: existing.count + 1,
			updatedAt: now,
		});
	} else {
		await ctx.db.insert("activity_log", {
			actionType: args.actionType,
			count: 1,
			createdAt: now,
			dayKey,
			emotionalProfileId: args.emotionalProfileId,
			updatedAt: now,
		});
	}

	// Every completed reflect or vent lands here, so the first one earns it;
	// the helper skips any after that.
	const isSession = args.actionType === "reflect" || args.actionType === "vent";
	if (isSession) {
		await awardAchievement(ctx, args.emotionalProfileId, "first-session", now);
	}
	// A tended breathing twig; a solo session's "Sit with this" logs reflect,
	// so finalizeCompletion awards that one (#695).
	if (args.actionType === "sit_with_this") {
		await awardAchievement(ctx, args.emotionalProfileId, "sat-with-it", now);
	}
	if (args.actionType === "listen") {
		await awardAchievement(ctx, args.emotionalProfileId, "first-listen", now);
	}

	// Zero-weight actions (quotes) log history but never touch the streak.
	if (!countsTowardStreak(args.actionType)) {
		return;
	}

	// expectedPrevious gap check on day keys (#426): yesterday → +1, today →
	// unchanged, otherwise reset. A dayKey *behind* the last one (timezone moved
	// west, or a backdated timestamp) counts as "today" — past days stand and
	// are never double-counted. Floor at 1: this day now has a qualifying row.
	let newStreak: number;
	let freezes = state.freezes;
	let savers = profile.streakSavers ?? 0;
	let brokenStreak: Doc<"emotional_profiles">["brokenStreak"];
	if (previousDayKey === undefined) {
		newStreak = 1;
	} else if (dayKey <= previousDayKey) {
		newStreak = Math.max(profile.currentStreak, 1);
	} else if (previousDayKey === shiftDayKey(dayKey, -1)) {
		newStreak = profile.currentStreak + 1;
		freezes = await earnFreeze(ctx, profile, dayKey, newStreak, freezes);
		// Silently (#700): the streak badge's push stands in for the old
		// milestone push, and a milestone with no rung (400) sends nothing.
		if (isStreakMilestone(newStreak)) {
			savers = Math.min(savers + 1, SAVER_CAP);
		}
	} else {
		newStreak = 1;
		// Keep the run this reset cuts, so a revive later today can restore it.
		if (profile.currentStreak > 0) {
			brokenStreak = {
				lastCoveredDay: previousDayKey,
				streak: profile.currentStreak,
			};
		}
	}

	const daysShowedUp = (profile.daysShowedUp ?? 0) + 1;
	const previousLongestStreak = profile.longestStreak ?? profile.currentStreak;
	const newLongestStreak = Math.max(newStreak, previousLongestStreak);

	await ctx.db.patch("emotional_profiles", args.emotionalProfileId, {
		currentStreak: newStreak,
		longestStreak: newLongestStreak,
		streakFreezes: freezes,
		...(savers !== (profile.streakSavers ?? 0) && { streakSavers: savers }),
		...(brokenStreak && { brokenStreak }),
		...(firstShowedUp && { daysShowedUp, lastShowedUpDay: dayKey }),
		// lastSessionAt keeps meaning "last completed reflect" (#426) — nudges,
		// Return Welcome and plus-offers read it. Never moves backward.
		...(args.actionType === "reflect" && {
			lastSessionAt: Math.max(now, profile.lastSessionAt ?? 0),
		}),
		updatedAt: now,
	});
	await awardStreakRungs(
		ctx,
		args.emotionalProfileId,
		{ from: previousLongestStreak, to: newLongestStreak },
		now
	);
	if (firstShowedUp) {
		await awardShowingUpRung(ctx, args.emotionalProfileId, daysShowedUp, now);
	}
}

/** The instant a local day begins. Two passes land right across a DST change. */
export function dayStartMs(dayKey: string, timezone: string): number {
	const naive = Date.parse(`${dayKey}T00:00:00Z`);
	let guess = naive;
	for (let i = 0; i < 2; i++) {
		guess = naive - (wallClockMs(guess, timezone) - guess);
	}
	return guess;
}

/** The zone's wall clock at `timestampMs`, read as if it were UTC. */
function wallClockMs(timestampMs: number, timezone: string): number {
	const parts = new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		hour: "2-digit",
		hourCycle: "h23",
		minute: "2-digit",
		month: "2-digit",
		second: "2-digit",
		timeZone: timezone,
		year: "numeric",
	}).format(new Date(timestampMs));
	// "YYYY-MM-DD, HH:MM:SS"
	return Date.parse(parts.replace(", ", "T") + "Z");
}

/** "YYYY-MM-DD" shifted by whole calendar days (DST-free: pure date math). */
export function shiftDayKey(dayKey: string, days: number): string {
	const date = new Date(`${dayKey}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}
