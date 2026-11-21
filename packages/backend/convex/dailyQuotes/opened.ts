import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type MutationCtx, mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { resetDailyQuoteBackoff } from "./schedule";

/**
 * Whether the person has opened a quote (B19). `openedAt` is new, so a
 * reaction, a save or a reply counts too: none can happen unopened, and
 * builds from before `markOpened` still write them.
 */
export function quoteOpened(quote: Doc<"daily_quotes">): boolean {
	return (
		quote.openedAt !== undefined ||
		quote.reaction !== undefined ||
		quote.savedAt !== undefined ||
		quote.reply !== undefined
	);
}

/**
 * Note that the person opened `quote`: the first time sets `openedAt`, and
 * every time starts the daily quote push's backoff over.
 */
export async function noteQuoteOpened(
	ctx: MutationCtx,
	quote: Doc<"daily_quotes">
): Promise<void> {
	if (quote.openedAt === undefined) {
		await ctx.db.patch("daily_quotes", quote._id, { openedAt: Date.now() });
	}
	await resetDailyQuoteBackoff(ctx, quote.emotionalProfileId);
}

/**
 * The app opened a quote on the Quotes screen. Idempotent; someone else's
 * quote, or one that's gone, is ignored rather than refused, so a stale id
 * from a tapped push never errors.
 */
export const markOpened = mutation({
	args: { quoteId: v.id("daily_quotes") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const quote = await ctx.db.get("daily_quotes", args.quoteId);
		if (quote?.emotionalProfileId === profile._id) {
			await noteQuoteOpened(ctx, quote);
		}
		return null;
	},
	returns: v.null(),
});
