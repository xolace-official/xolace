/**
 * The letters push switch, kept in `preferences.notifications.letters` (a
 * notification preference like `chat`; absent = on) and read and written here
 * so S20's seam keeps its shape.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { updateNotificationPrefs } from "../lib/notificationPrefs";

export const getPush = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();
		return preferences?.notifications.letters !== false;
	},
	returns: v.boolean(),
});

export const setPush = mutation({
	args: { on: v.boolean() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		// Every account gets a preferences row at sign-up; none means a broken
		// account, and a switch that silently does nothing would hide it.
		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();
		if (!preferences) {
			throw new ConvexError({
				code: "preferences_not_found",
				message: "Preferences not found",
			});
		}
		await updateNotificationPrefs(ctx, profile._id, { letters: args.on });
		return null;
	},
	returns: v.null(),
});
