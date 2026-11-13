import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { heavierChoiceValidator, resolveCardCore } from "./followUps/resolve";
import { requireAuth } from "./lib/auth";

/**
 * Record (or replace) the structured response to a follow-up card: the
 * "what helped?" text, the share flag, and the heavier-menu choice. Upserts —
 * one row per card, the latest submit wins. The chip itself is still written
 * by `followUps.resolveCard`; this never touches `follow_up_cards`. Both go
 * through `resolveCardCore`.
 */
export const record = mutation({
	args: {
		cardId: v.id("follow_up_cards"),
		heavierChoice: v.optional(heavierChoiceValidator),
		reflectionText: v.optional(v.string()),
		shareRequested: v.boolean(),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const outcome = await resolveCardCore(ctx, {
			cardId: args.cardId,
			details: {
				heavierChoice: args.heavierChoice,
				reflectionText: args.reflectionText,
				shareRequested: args.shareRequested,
			},
			profileId: profile._id,
			source: "app",
		});
		// false = nothing written; the client keeps its editor open.
		return outcome === "accepted";
	},
});

/** The caller's response for one of their cards, or null. */
export const getForCard = query({
	args: { cardId: v.id("follow_up_cards") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const row = await ctx.db
			.query("follow_up_responses")
			.withIndex("by_card", (q) => q.eq("cardId", args.cardId))
			.first();
		return row && row.emotionalProfileId === profile._id ? row : null;
	},
});

/** Delete a card's response. Every path that deletes a card calls this first. */
export async function deleteResponsesForCard(
	ctx: MutationCtx,
	cardId: Id<"follow_up_cards">
): Promise<void> {
	const rows = await ctx.db
		.query("follow_up_responses")
		.withIndex("by_card", (q) => q.eq("cardId", cardId))
		.take(10);
	for (const row of rows) {
		await ctx.db.delete("follow_up_responses", row._id);
	}
}
