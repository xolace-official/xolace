import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { profileCardValidator } from "../lib/validators";
import { preferencesRow, requirePreferencesRow } from "./row";

/**
 * The You cards someone took off their profile (Settings › Appearance ›
 * Profile; redesign B7). Display only: hiding a card changes nothing else.
 *
 * `preferences.get` returns the same list as `hiddenProfileCards`; this query
 * is the narrow read for the You screen, so it doesn't re-render on every
 * other preference change.
 */
export const getHidden = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await preferencesRow(ctx, profile._id);
		return prefs?.hiddenProfileCards ?? [];
	},
	returns: v.array(profileCardValidator),
});

/**
 * Hide or show one card. One card per call, not the whole list, so two quick
 * toggles can't overwrite each other from a stale read. Idempotent.
 */
export const setHidden = mutation({
	args: { card: profileCardValidator, hidden: v.boolean() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await requirePreferencesRow(ctx, profile._id);
		const current = prefs.hiddenProfileCards ?? [];
		if (current.includes(args.card) === args.hidden) {
			return null;
		}
		await ctx.db.patch("preferences", prefs._id, {
			hiddenProfileCards: args.hidden
				? [...current, args.card]
				: current.filter((c) => c !== args.card),
		});
		return null;
	},
	returns: v.null(),
});
