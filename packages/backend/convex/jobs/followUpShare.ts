import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { distillerCache, moderationCache } from "../ai/cached";
import { buildDistillerPrompt } from "../ai/prompts/distiller";
import { isFollowUpPoolable } from "../lib/poolability";

async function readShare(ctx: QueryCtx, responseId: Id<"follow_up_responses">) {
  const response = await ctx.db.get("follow_up_responses", responseId);
  if (!response) return null;
  const card = await ctx.db.get("follow_up_cards", response.cardId);
  if (!card) return null;
  const session = await ctx.db.get("sessions", card.sessionId);
  if (!session) return null;
  return {
    shareable: isFollowUpPoolable({
      shareRequested: response.shareRequested,
      reflectionText: response.reflectionText,
      tier: card.tier,
      escalationDerived: card.escalationDerived,
      safeguardLevel: session.safeguardLevel,
    }),
    text: response.reflectionText ?? "",
    mirrorText: session.mirrorText ?? "",
    sessionId: session._id,
  };
}

/** The response's text, whether it may still share, and its source session. */
export const loadForShare = internalQuery({
  args: { responseId: v.id("follow_up_responses") },
  returns: v.union(
    v.null(),
    v.object({
      shareable: v.boolean(),
      text: v.string(),
      mirrorText: v.string(),
      sessionId: v.id("sessions"),
    }),
  ),
  handler: async (ctx, args) => readShare(ctx, args.responseId),
});

/**
 * Re-check the gate in the same transaction as the pool write: consent can be
 * revoked (or the text edited) while moderation/distillation run.
 */
export const contributeIfShareable = internalMutation({
  args: {
    responseId: v.id("follow_up_responses"),
    sourceText: v.string(),
    displayText: v.string(),
    primaryEmotion: v.string(),
    granularLabel: v.optional(v.string()),
    thematicTags: v.array(v.string()),
    intensity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { responseId, sourceText, ...reflection }) => {
    const current = await readShare(ctx, responseId);
    if (!current?.shareable || current.text !== sourceText) return null;
    await ctx.runMutation(internal.reflections.contribute, reflection);
    return null;
  },
});

const MAX_SHARE_ATTEMPTS = 3;
const RETRY_BASE_MS = 60_000;

/** Clear the once-only marker so a later opt-in can schedule a fresh attempt. */
export const releaseShare = internalMutation({
  args: { responseId: v.id("follow_up_responses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const response = await ctx.db.get("follow_up_responses", args.responseId);
    if (response)
      await ctx.db.patch("follow_up_responses", args.responseId, {
        shareScheduledAt: undefined,
      });
    return null;
  },
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
    responseId: v.id("follow_up_responses"),
    attempt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { responseId } = args;
    const loaded = await ctx.runQuery(
      internal.jobs.followUpShare.loadForShare,
      { responseId },
    );
    if (!loaded?.shareable) return null;
    const { text, mirrorText, sessionId } = loaded;
    // The matching fingerprint is the source session's Understanding.
    const metadata = await ctx.runQuery(
      internal.understanding.getUnderstanding,
      { sessionId },
    );
    if (!metadata) return null;

    try {
      const moderation = await moderationCache.fetch(ctx, { text });
      if (moderation.flagged) return null;

      const prompt = buildDistillerPrompt({
        rawInput: text,
        mirrorText,
        primaryEmotion: metadata.primaryEmotion,
        granularLabel: metadata.granularLabel,
        intensity: metadata.intensity,
        thematicTags: metadata.thematicTags,
        userLanguageTags: metadata.userLanguageTags,
      });
      const distilled = await distillerCache.fetch(ctx, {
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
      });
      if (!distilled || distilled === "NULL") return null;

      await ctx.runMutation(internal.jobs.followUpShare.contributeIfShareable, {
        responseId,
        sourceText: text,
        displayText: distilled,
        primaryEmotion: metadata.primaryEmotion,
        granularLabel: metadata.granularLabel,
        thematicTags: metadata.thematicTags,
        intensity: metadata.intensity,
      });
    } catch (error) {
      const attempt = args.attempt ?? 1;
      console.error(`Follow-up share failed (attempt ${attempt}):`, error);
      if (attempt < MAX_SHARE_ATTEMPTS) {
        await ctx.scheduler.runAfter(
          RETRY_BASE_MS * 4 ** (attempt - 1),
          internal.jobs.followUpShare.share,
          {
            responseId,
            attempt: attempt + 1,
          },
        );
      } else {
        await ctx.runMutation(internal.jobs.followUpShare.releaseShare, {
          responseId,
        });
      }
    }
    return null;
  },
});
