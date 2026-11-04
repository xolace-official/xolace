import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
	type Achievement,
	type AchievementId,
	findAchievement,
} from "./catalog";
import { scheduleMissedBadgeCheck } from "./push";

/**
 * Award one achievement live (#685): the single write path for
 * `user_achievements`, called inline in the write site's own transaction.
 *
 * Idempotent: an existing row means nothing happens, and sparks are credited
 * to both counters only alongside an insert. Does nothing for a profile whose
 * `achievementsBackfilledAt` isn't set yet: existing profiles wait for the
 * one-off backfill (#686), so it can date their awards and keep them quiet.
 * A live award schedules the profile's missed-beat push check (#700).
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
	const earned = await insertAward(ctx, profile, achievement, {
		achievementId,
		earnedAt,
		source: "live",
	});
	if (earned) {
		await scheduleMissedBadgeCheck(ctx, profile);
	}
	return earned;
}

/**
 * The insert behind both the live award and the backfill (achievements/backfill.ts):
 * an existing row, of either source, means nothing happens; otherwise the row
 * and both spark counters move together.
 *
 * @returns whether a row was inserted.
 */
export async function insertAward(
	ctx: MutationCtx,
	profile: Doc<"emotional_profiles">,
	achievement: Achievement,
	award: {
		achievementId: AchievementId;
		earnedAt: number;
		source: Doc<"user_achievements">["source"];
	}
): Promise<boolean> {
	const existing = await ctx.db
		.query("user_achievements")
		.withIndex("by_emotionalProfileId_and_achievementId", (q) =>
			q
				.eq("emotionalProfileId", profile._id)
				.eq("achievementId", award.achievementId)
		)
		.unique();
	if (existing) {
		return false;
	}

	await ctx.db.insert("user_achievements", {
		...award,
		emotionalProfileId: profile._id,
		sparks: achievement.sparks,
	});
	await ctx.db.patch("emotional_profiles", profile._id, {
		sparkBalance: (profile.sparkBalance ?? 0) + achievement.sparks,
		sparksEarned: (profile.sparksEarned ?? 0) + achievement.sparks,
	});
	return true;
}
