import { ConvexError, v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { mutation, MutationCtx } from "../_generated/server";
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
  now: number = Date.now(),
): Promise<number> {
  // Settle first: a gap a freeze can cover is bridged, never revived.
  const { revive, freezes, timezone } = await settleStreak(ctx, profile, now);
  if (!revive) throw new ConvexError({ code: "no_revive_available" });

  // settleStreak only offers a revive with a saver on hand.
  let savers = (profile.streakSavers ?? 0) - 1;
  let streakFreezes = freezes;
  // Today already acted on: the restored run steps onto today, so it earns
  // exactly as recordActivity would have had the revive come first.
  if (revive.streak !== profile.currentStreak) {
    const revived = { ...profile, streakRevivedDay: revive.gapDay };
    streakFreezes = await earnFreeze(ctx, revived, localDayKey(now, timezone), revive.streak, freezes);
    if (isStreakMilestone(revive.streak)) savers = Math.min(savers + 1, SAVER_CAP);
  }

  await ctx.db.patch("emotional_profiles", profile._id, {
    currentStreak: revive.streak,
    longestStreak: Math.max(revive.streak, profile.longestStreak ?? profile.currentStreak),
    streakSavers: savers,
    streakFreezes,
    streakRevivedDay: revive.gapDay,
    brokenStreak: undefined,
    updatedAt: now,
  });
  return revive.streak;
}

export const revive = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    return reviveStreak(ctx, profile);
  },
});
