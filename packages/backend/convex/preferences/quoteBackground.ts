import type { Infer } from "convex/values";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { quoteBackgroundValidator } from "../lib/validators";
import { preferencesRow, requirePreferencesRow } from "./row";

/**
 * The background behind the daily quote, kept on the account (redesign B7,
 * `quotes.md` §1) so it holds across opens and devices. Free for everyone.
 *
 * Stored as `preferences.quoteBackground`, not inside `preferences.quotes`:
 * that object's presence opts the account into the nightly quote generator,
 * so writing it just to hold a background would change who gets quotes, and
 * its `themes` are the content slugs picked at setup, a different thing.
 */

/** New people start on Poster, the background production has today. */
export const DEFAULT_QUOTE_BACKGROUND: Infer<typeof quoteBackgroundValidator> =
	"poster";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await preferencesRow(ctx, profile._id);
		return prefs?.quoteBackground ?? DEFAULT_QUOTE_BACKGROUND;
	},
	returns: quoteBackgroundValidator,
});

export const set = mutation({
	args: { background: quoteBackgroundValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await requirePreferencesRow(ctx, profile._id);
		if (prefs.quoteBackground !== args.background) {
			await ctx.db.patch("preferences", prefs._id, {
				quoteBackground: args.background,
			});
		}
		return null;
	},
	returns: v.null(),
});
