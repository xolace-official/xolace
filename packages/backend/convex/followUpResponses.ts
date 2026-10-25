import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { isFollowUpPoolable } from "./lib/poolability";

// Same order of magnitude as a product-feedback note — a sentence or a few,
// never a session transcript.
export const REFLECTION_MAX_LENGTH = 2000;

/**
 * Record (or replace) the structured response to a follow-up card: the
 * "what helped?" text, the share flag, and the heavier-menu choice. Upserts —
 * one row per card, the latest submit wins. The chip itself is still written
 * by `followUps.resolveCard`; this never touches `follow_up_cards`.
 */
export const record = mutation({
	args: {
		cardId: v.id("follow_up_cards"),
		heavierChoice: v.optional(
			v.union(
				v.literal("crisis_resources"),
				v.literal("music"),
				v.literal("support_audio"),
				v.literal("library")
			)
		),
		reflectionText: v.optional(v.string()),
		shareRequested: v.boolean(),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const card = await ctx.db.get("follow_up_cards", args.cardId);
		// false = nothing written; the client keeps its editor open.
		if (!card || card.emotionalProfileId !== profile._id) {
			return false;
		}

		const text = args.reflectionText?.trim() || undefined;
		if (text && text.length > REFLECTION_MAX_LENGTH) {
			throw new ConvexError({
				code: "reflection_too_long",
				message: `Reflection exceeds ${REFLECTION_MAX_LENGTH} characters`,
			});
		}

		const fields = {
			heavierChoice: args.heavierChoice,
			reflectionText: text,
			shareRequested: args.shareRequested,
			updatedAt: Date.now(),
		};
		const existing = await ctx.db
			.query("follow_up_responses")
			.withIndex("by_card", (q) => q.eq("cardId", args.cardId))
			.first();
		let responseId = existing?._id;
		if (responseId) {
			await ctx.db.patch("follow_up_responses", responseId, fields);
		} else {
			responseId = await ctx.db.insert("follow_up_responses", {
				...fields,
				cardId: args.cardId,
				createdAt: fields.updatedAt,
				emotionalProfileId: profile._id,
			});
		}

		// Share at most once per card, so no re-submit double-contributes. The
		// job re-checks every gate at run time (a later revoke wins).
		const session = await ctx.db.get("sessions", card.sessionId);
		if (
			!existing?.shareScheduledAt &&
			isFollowUpPoolable({
				escalationDerived: card.escalationDerived,
				reflectionText: text,
				safeguardLevel: session?.safeguardLevel,
				shareRequested: args.shareRequested,
				tier: card.tier,
			})
		) {
			await ctx.db.patch("follow_up_responses", responseId, {
				shareScheduledAt: Date.now(),
			});
			await ctx.scheduler.runAfter(0, internal.jobs.followUpShare.share, {
				responseId,
			});
		}
		return true;
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
