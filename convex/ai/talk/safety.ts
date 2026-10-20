import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { SessionContext } from "../context";
import { classifierCache, moderationCache } from "../cached";
import { MODERATION_UNAVAILABLE } from "../providers/moderation";
import { buildClassifierPrompt } from "../prompts/classifier";
import { buildPatternSummary } from "../helpers/patternSummary";
import { resolveMirrorTone } from "../mirrorPlan";
import { evaluateSafeguard } from "../safeguard";
import { peakOf } from "../../talk/safety";

/**
 * The classifier half of a live talk's safeguard (#599): the typed engine
 * over the person's lines so far, scheduled by syncLines when they speak.
 * Catches implicit risk moderation alone misses; its verdict lands for the
 * next turn (the one-turn lag is signed off in #581). Best-effort: a failure
 * leaves the floor, the moderation race and the end-of-talk safeguard.
 *
 * ponytail: one classifier call per person turn (cached on identical text).
 * Debounce to every other turn if cost says so.
 */
export const classify = internalAction({
  args: { sessionId: v.id("sessions"), rawText: v.string() },
  returns: v.null(),
  handler: async (ctx, { sessionId, rawText }) => {
    try {
      const context: SessionContext = await ctx.runQuery(internal.ai.context.buildSessionContext, { sessionId });
      if (context.session.state !== "initiated") return null;
      const patternSummary = buildPatternSummary({
        profile: context.profile,
        recentMetadata: context.recentMetadata,
        recentSessions: context.recentSessions,
        isFirstSession: context.isFirstSession,
        mirrorTone: resolveMirrorTone(context.preferences?.mirrorTone, context.isPremium),
      });
      const prompt = buildClassifierPrompt(
        rawText,
        patternSummary,
        context.isFirstSession,
        "talk",
        context.session.timeOfDay as string | undefined,
      );
      const [moderation, classification] = await Promise.all([
        moderationCache.fetch(ctx, { text: rawText }).catch(() => MODERATION_UNAVAILABLE),
        classifierCache.fetch(ctx, { systemPrompt: prompt.system, userPrompt: prompt.user }),
      ]);
      const peak = peakOf(evaluateSafeguard(classification, moderation, context.recentMetadata));
      if (peak) await ctx.runMutation(internal.talk.safety.raise, { sessionId, peak });
    } catch (err) {
      console.error("[talk] live classifier failed", err);
    }
    return null;
  },
});
