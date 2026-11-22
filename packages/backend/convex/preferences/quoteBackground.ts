import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { requirePremium } from "../lib/premium";
import { quoteBackgroundValidator } from "../lib/validators";
import {
	catalogueRow,
	DEFAULT_QUOTE_BACKGROUND,
} from "../quoteBackgrounds/catalogue";
import { preferencesRow, requirePreferencesRow } from "./row";

/**
 * The background behind the daily quote, kept on the account (redesign B7,
 * `quotes.md` §1) so it holds across opens and devices. Since B18 it's a key
 * in the `quote_backgrounds` catalogue, whose `plus` flag says which ones need
 * Xolace+.
 *
 * Stored as `preferences.quoteBackground`, not inside `preferences.quotes`:
 * that object's presence opts the account into the nightly quote generator,
 * so writing it just to hold a background would change who gets quotes, and
 * its `themes` are the content slugs picked at setup, a different thing.
 *
 * `get` returns the key as saved, even one later retired or moved to Xolace+:
 * the app draws Poster for a key it can't show, or once Plus lapses, and the
 * choice comes back with Plus.
 */

export const get = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await preferencesRow(ctx, profile._id);
		return prefs?.quoteBackground ?? DEFAULT_QUOTE_BACKGROUND;
	},
	returns: quoteBackgroundValidator,
});

/**
 * @throws ConvexError `unknown_background` for a key the catalogue doesn't
 *   list as active (Poster is always accepted)
 * @throws Error "Xolace+ required" for a Plus background without Plus
 */
export const set = mutation({
	args: { background: quoteBackgroundValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await requirePreferencesRow(ctx, profile._id);
		if (args.background !== DEFAULT_QUOTE_BACKGROUND) {
			const row = await catalogueRow(ctx, args.background);
			if (!row?.active) {
				throw new ConvexError({
					code: "unknown_background",
					message: `No background "${args.background}"`,
				});
			}
			if (row.plus) {
				await requirePremium(ctx, profile, "this quote background");
			}
		}
		if (prefs.quoteBackground !== args.background) {
			await ctx.db.patch("preferences", prefs._id, {
				quoteBackground: args.background,
			});
		}
		return null;
	},
	returns: v.null(),
});
