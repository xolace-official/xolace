import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "../_generated/server";
import { distillerCache, moderationCache } from "../ai/cached";
import { buildDistillerPrompt } from "../ai/prompts/distiller";
import { isFollowUpPoolable } from "../lib/poolability";

async function readShare(ctx: QueryCtx, responseId: Id<"follow_up_responses">) {
	const response = await ctx.db.get("follow_up_responses", responseId);
	if (!response) {
		return null;
	}
	const card = await ctx.db.get("follow_up_cards", response.cardId);
	if (!card) {
		return null;
	}
	const session = await ctx.db.get("sessions", card.sessionId);
	if (!session) {
		return null;
	}
	return {
		mirrorText: session.mirrorText ?? "",
		sessionId: session._id,
		shareable: isFollowUpPoolable({
			escalationDerived: card.escalationDerived,
			reflectionText: response.reflectionText,
			safeguardLevel: session.safeguardLevel,
			shareRequested: response.shareRequested,
			tier: card.tier,
		}),
		text: response.reflectionText ?? "",
	};
}

/** The response's text, whether it may still share, and its source session. */
export const loadForShare = internalQuery({
	args: { responseId: v.id("follow_up_responses") },
	handler: async (ctx, args) => readShare(ctx, args.responseId),
	returns: v.union(
		v.null(),
		v.object({
			mirrorText: v.string(),
			sessionId: v.id("sessions"),
			shareable: v.boolean(),
			text: v.string(),
		})
	),
});

/**
 * Re-check the gate in the same transaction as the pool write: consent can be
 * revoked (or the text edited) while moderation/distillation run.
 */
export const contributeIfShareable = internalMutation({
	args: {
		displayText: v.string(),
		granularLabel: v.optional(v.string()),
		intensity: v.number(),
		primaryEmotion: v.string(),
		responseId: v.id("follow_up_responses"),
		sourceText: v.string(),
		thematicTags: v.array(v.string()),
	},
	handler: async (ctx, { responseId, sourceText, ...reflection }) => {
		const current = await readShare(ctx, responseId);
		if (!current?.shareable || current.text !== sourceText) {
			return null;
		}
		await ctx.runMutation(internal.reflections.contribute, reflection);
		return null;
	},
	returns: v.null(),
});

const MAX_SHARE_ATTEMPTS = 3;
const RETRY_BASE_MS = 60_000;

/** Clear the once-only marker so a later opt-in can schedule a fresh attempt. */
export const releaseShare = internalMutation({
	args: { responseId: v.id("follow_up_responses") },
	handler: async (ctx, args) => {
		const response = await ctx.db.get("follow_up_responses", args.responseId);
		if (response) {
			await ctx.db.patch("follow_up_responses", args.responseId, {
				shareScheduledAt: undefined,
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Share a follow-up "what helped?" reflection (#449) into the peer pool the
 * way session text gets there: moderated, then through the same voice-
 * preserving anonymizer, then `reflections.contribute` (no author link).
 * Gates are re-read at run time so a revoked share never lands. Fails closed:
 * a flagged text or a NULL distillation shares nothing. A thrown error
 * (outage) retries with backoff, then releases the marker so a re-submit can
 * try again.
 */
export const share = internalAction({
	args: {
		attempt: v.optional(v.number()),
		responseId: v.id("follow_up_responses"),
	},
	handler: async (ctx, args) => {
		const { responseId } = args;
		const loaded = await ctx.runQuery(
			internal.jobs.followUpShare.loadForShare,
			{ responseId }
		);
		if (!loaded?.shareable) {
			return null;
		}
		const { text, mirrorText, sessionId } = loaded;
		// The matching fingerprint is the source session's Understanding.
		const metadata = await ctx.runQuery(
			internal.understanding.getUnderstanding,
			{ sessionId }
		);
		if (!metadata) {
			return null;
		}

		try {
			const moderation = await moderationCache.fetch(ctx, { text });
			if (moderation.flagged) {
				return null;
			}

			const prompt = buildDistillerPrompt({
				granularLabel: metadata.granularLabel,
				intensity: metadata.intensity,
				mirrorText,
				primaryEmotion: metadata.primaryEmotion,
				rawInput: text,
				thematicTags: metadata.thematicTags,
				userLanguageTags: metadata.userLanguageTags,
			});
			const distilled = await distillerCache.fetch(ctx, {
				systemPrompt: prompt.system,
				userPrompt: prompt.user,
			});
			if (!distilled || distilled === "NULL") {
				return null;
			}

			await ctx.runMutation(internal.jobs.followUpShare.contributeIfShareable, {
				displayText: distilled,
				granularLabel: metadata.granularLabel,
				intensity: metadata.intensity,
				primaryEmotion: metadata.primaryEmotion,
				responseId,
				sourceText: text,
				thematicTags: metadata.thematicTags,
			});
		} catch (error) {
			const attempt = args.attempt ?? 1;
			console.error(`Follow-up share failed (attempt ${attempt}):`, error);
			if (attempt < MAX_SHARE_ATTEMPTS) {
				await ctx.scheduler.runAfter(
					RETRY_BASE_MS * 4 ** (attempt - 1),
					internal.jobs.followUpShare.share,
					{
						attempt: attempt + 1,
						responseId,
					}
				);
			} else {
				await ctx.runMutation(internal.jobs.followUpShare.releaseShare, {
					responseId,
				});
			}
		}
		return null;
	},
	returns: v.null(),
});
