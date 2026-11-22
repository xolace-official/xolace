import type { Infer } from "convex/values";
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import {
	exploreContinueItemValidator,
	exploreHiddenContinueValidator,
} from "../lib/validators";
import { preferencesRow, requirePreferencesRow } from "./row";

/**
 * What someone turned off on Explore home (redesign B7, `explore.md` §5, §8):
 *
 * - **"Remove from here"** on a "Pick up where you left off" card hides that
 *   card. Kept per item (a track or a Lantern entry) with when it was hidden.
 * - **"Don't use my sessions here"** turns off what Explore suggests from
 *   their sessions ("Because you named…"). It's a privacy promise, not a
 *   display choice. `browse/explore.forYou` (B6) reads it and touches no
 *   session data when it's false (pinned in `browse/explore.test.ts`).
 *   **Any other server-side personalisation of Explore must do the same: no
 *   sessions, Understanding or anything derived from them when it's false.**
 *
 * A removed Continue card stays removed even if the person goes back to it
 * (B6 decided; `browse/explore.getContinue`).
 *
 * Neither changes anything outside Explore.
 */

type ContinueItem = Infer<typeof exploreContinueItemValidator>;

/**
 * The most hidden Continue cards kept; past it the oldest drops off. The
 * shelf shows three cards from recent listening and reading, so an item
 * hidden this many removals ago has long left it.
 */
export const MAX_HIDDEN_CONTINUE = 50;

const sameItem = (a: ContinueItem, b: ContinueItem) =>
	a.kind === b.kind && a.id === b.id;

export const get = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await preferencesRow(ctx, profile._id);
		return {
			hiddenContinue: prefs?.exploreHiddenContinue ?? [],
			usesSessions: prefs?.exploreUsesSessions ?? true,
		};
	},
	returns: v.object({
		// With `hiddenAt`, so whoever decides whether a card the person went
		// back to after hiding it shows again can compare the two times.
		hiddenContinue: v.array(exploreHiddenContinueValidator),
		usesSessions: v.boolean(),
	}),
});

/**
 * "Remove from here". Hiding a card that's already hidden moves it to the
 * newest end with a fresh `hiddenAt`.
 */
export const hideContinueItem = mutation({
	args: { item: exploreContinueItemValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await requirePreferencesRow(ctx, profile._id);
		const others = (prefs.exploreHiddenContinue ?? []).filter(
			(h) => !sameItem(h.item, args.item)
		);
		await ctx.db.patch("preferences", prefs._id, {
			exploreHiddenContinue: [
				...others,
				{ hiddenAt: Date.now(), item: args.item },
			].slice(-MAX_HIDDEN_CONTINUE),
		});
		return null;
	},
	returns: v.null(),
});

/** "Don't use my sessions here" (false), or turning it back on (true). */
export const setUsesSessions = mutation({
	args: { usesSessions: v.boolean() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await requirePreferencesRow(ctx, profile._id);
		if ((prefs.exploreUsesSessions ?? true) !== args.usesSessions) {
			await ctx.db.patch("preferences", prefs._id, {
				exploreUsesSessions: args.usesSessions,
			});
		}
		return null;
	},
	returns: v.null(),
});
