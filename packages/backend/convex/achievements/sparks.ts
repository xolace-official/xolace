import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { FREEZE_CAP, FREEZE_SPARK_PRICE } from "../lib/streakFreezes";
import { settleStreak } from "../streaks/state";

/**
 * Spending sparks (#680, #698). Only `sparkBalance` goes down: sparks earned
 * is lifetime and only grows.
 */

/**
 * A gap that outran the freeze stock stays open until the next action resets
 * the count; a freeze bought now would bridge it after the fact, so none sells.
 */
export function streakLapsed(
	{ streak }: { streak: number },
	{ currentStreak }: Doc<"emotional_profiles">
): boolean {
	return streak === 0 && currentStreak > 0;
}

/** One streak freeze for FREEZE_SPARK_PRICE sparks. */
export const buyFreeze = mutation({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const now = Date.now();
		// Settle first, so the stock counts freezes a missed day already spent.
		const state = await settleStreak(ctx, profile, now);
		const { freezes } = state;
		if (streakLapsed(state, profile)) {
			throw new ConvexError({ code: "streak_lapsed" });
		}
		const balance = profile.sparkBalance ?? 0;
		if (balance < FREEZE_SPARK_PRICE) {
			throw new ConvexError({ code: "insufficient_sparks" });
		}
		if (freezes >= FREEZE_CAP) {
			throw new ConvexError({ code: "freeze_cap_reached" });
		}

		await ctx.db.patch("emotional_profiles", profile._id, {
			sparkBalance: balance - FREEZE_SPARK_PRICE,
			streakFreezes: freezes + 1,
			updatedAt: now,
		});
		await ctx.db.insert("spark_spends", {
			emotionalProfileId: profile._id,
			item: "streak_freeze",
			sparks: FREEZE_SPARK_PRICE,
			spentAt: now,
		});
		return null;
	},
	returns: v.null(),
});
