import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { awardStreakRungs } from "../achievements/ladders";
import { requireAuth } from "../lib/auth";
import { localDayKey } from "./activityLog";
import { isStreakMilestone } from "./milestones";
import { earnFreeze, SAVER_CAP, settleStreak } from "./state";

/**
 * Spend one streak saver to undo a break (#435). Restores the exact prior
 * count (plus today, if the break's first action already landed), unmarked.
 * Writes no activity_log or frozen_days row for the missed day — the graph
 * keeps it honest; only the counter comes back. Returns the restored streak.
 */
export async function reviveStreak(
	ctx: MutationCtx,
	profile: Doc<"emotional_profiles">,
	now: number = Date.now()
): Promise<number> {
	// Settle first: a gap a freeze can cover is bridged, never revived.
	const { revive, freezes, timezone } = await settleStreak(ctx, profile, now);
	if (!revive) {
		throw new ConvexError({ code: "no_revive_available" });
	}

	// settleStreak only offers a revive with a saver on hand.
	let savers = (profile.streakSavers ?? 0) - 1;
	let streakFreezes = freezes;
	// Today already acted on: the restored run steps onto today, so it earns
	// exactly as recordActivity would have had the revive come first.
	if (revive.streak !== profile.currentStreak) {
		const revived = { ...profile, streakRevivedDay: revive.gapDay };
		streakFreezes = await earnFreeze(
			ctx,
			revived,
			localDayKey(now, timezone),
			revive.streak,
			freezes
		);
		if (isStreakMilestone(revive.streak)) {
			savers = Math.min(savers + 1, SAVER_CAP);
		}
	}

	const previousLongestStreak = profile.longestStreak ?? profile.currentStreak;
	const longestStreak = Math.max(revive.streak, previousLongestStreak);
	await ctx.db.patch("emotional_profiles", profile._id, {
		brokenStreak: undefined,
		currentStreak: revive.streak,
		longestStreak,
		streakFreezes,
		streakRevivedDay: revive.gapDay,
		streakSavers: savers,
		updatedAt: now,
	});
	// A run restored onto a rung earns it (#694).
	await awardStreakRungs(
		ctx,
		profile._id,
		{ from: previousLongestStreak, to: longestStreak },
		now
	);
	return revive.streak;
}

export const revive = mutation({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		return reviveStreak(ctx, profile);
	},
	returns: v.number(),
});
