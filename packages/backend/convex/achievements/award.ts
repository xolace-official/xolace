import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { type AchievementId, findAchievement } from "./catalog";

/**
 * Award one achievement live (#685): the single write path for
 * `user_achievements`, called inline in the write site's own transaction.
 *
 * Idempotent: an existing row means nothing happens, and sparks are credited
 * to both counters only alongside an insert. Does nothing for a profile whose
 * `achievementsBackfilledAt` isn't set yet: existing profiles wait for the
 * one-off backfill (#686), so it can date their awards and keep them quiet.
 *
 * @returns whether this call earned it.
 */
export async function awardAchievement(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	achievementId: AchievementId,
	earnedAt: number = Date.now()
): Promise<boolean> {
	const achievement = findAchievement(achievementId);
	if (!achievement) {
		// A `streak-${n}` off the ladder: there's nothing to earn.
		return false;
	}
	const profile = await ctx.db.get("emotional_profiles", emotionalProfileId);
	if (profile?.achievementsBackfilledAt === undefined) {
		return false;
	}
	const existing = await ctx.db
		.query("user_achievements")
		.withIndex("by_emotionalProfileId_and_achievementId", (q) =>
			q
				.eq("emotionalProfileId", emotionalProfileId)
				.eq("achievementId", achievementId)
		)
		.unique();
	if (existing) {
		return false;
	}

	await ctx.db.insert("user_achievements", {
		achievementId,
		earnedAt,
		emotionalProfileId,
		source: "live",
		sparks: achievement.sparks,
	});
	await ctx.db.patch("emotional_profiles", emotionalProfileId, {
		sparkBalance: (profile.sparkBalance ?? 0) + achievement.sparks,
		sparksEarned: (profile.sparksEarned ?? 0) + achievement.sparks,
	});
	return true;
}
