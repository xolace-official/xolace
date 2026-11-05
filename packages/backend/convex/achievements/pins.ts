import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { findAchievement } from "./catalog";
import { earnedRows, SHELF_BADGES } from "./display";

/**
 * Pinning earned badges to the profile's row (#688, #699). A pin is the user's
 * own choice of what stands for them there; badges stay private.
 */

/** As many pins as the row has slots. */
export const PIN_LIMIT = SHELF_BADGES;

/**
 * Pins or unpins one earned badge. Idempotent. A pin past the limit is refused
 * rather than replacing one, so nothing the user chose is lost.
 */
export const setPinned = mutation({
	args: { achievementId: v.string(), pinned: v.boolean() },
	handler: async (ctx, { achievementId, pinned }) => {
		const { profile } = await requireAuth(ctx);
		const row = await ctx.db
			.query("user_achievements")
			.withIndex("by_emotionalProfileId_and_achievementId", (q) =>
				q
					.eq("emotionalProfileId", profile._id)
					.eq("achievementId", achievementId)
			)
			.unique();
		if (!row) {
			throw new ConvexError({ code: "not_earned" });
		}
		if (pinned === (row.pinnedAt !== undefined)) {
			return null;
		}
		if (!pinned) {
			await ctx.db.patch("user_achievements", row._id, {
				pinnedAt: undefined,
			});
			return null;
		}
		// A row on an id the catalog retired can't show, so it pins as not earned.
		if (!findAchievement(achievementId)) {
			throw new ConvexError({ code: "not_earned" });
		}
		// Only pins the row can show count: one left on a retired id can't be unpinned.
		const pins = (await earnedRows(ctx, profile._id)).filter(
			(r) => r.pinnedAt !== undefined && findAchievement(r.achievementId)
		);
		if (pins.length >= PIN_LIMIT) {
			throw new ConvexError({ code: "pin_limit_reached" });
		}
		await ctx.db.patch("user_achievements", row._id, { pinnedAt: Date.now() });
		return null;
	},
	returns: v.null(),
});
