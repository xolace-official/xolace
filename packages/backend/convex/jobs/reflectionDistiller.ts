import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { distillerCache } from "../ai/cached";
import { buildDistillerPrompt } from "../ai/prompts/distiller";

/**
 * Speculatively distill a session's raw input into an anonymous,
 * voice-preserving first-person reflection.
 *
 * Scheduled immediately after mirror delivery. The result is stored
 * on the session so it's ready when the user reaches the contribution
 * prompt. If the user never contributes, the distillation is unused.
 */
export const distill = internalAction({
  args: {
    sessionId: v.id("sessions"),
    rawText: v.string(),
    mirrorText: v.string(),
    primaryEmotion: v.string(),
    granularLabel: v.optional(v.string()),
    intensity: v.number(),
    thematicTags: v.array(v.string()),
    userLanguageTags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const kept: boolean | null = await ctx.runQuery(internal.sessions.getSessionKept, {
      sessionId: args.sessionId,
    });
    if (kept !== true) return;

    try {
      const prompt = buildDistillerPrompt({
        rawInput: args.rawText,
        mirrorText: args.mirrorText,
        primaryEmotion: args.primaryEmotion,
        granularLabel: args.granularLabel,
        intensity: args.intensity,
        thematicTags: args.thematicTags,
        userLanguageTags: args.userLanguageTags,
      });

      const result = await distillerCache.fetch(ctx, {
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
      });

      // Model returned NULL — input not suitable for the pool
      if (!result || result === "NULL") {
        return;
      }

      await ctx.runMutation(internal.sessions.storeDistilledText, {
        sessionId: args.sessionId,
        distilledText: result,
      });
    } catch (error) {
      // Distillation is speculative — failures are non-critical.
      // The anonymizer will fall back to mirror text if no distilledText exists.
      console.error("Distillation failed:", error);
    }
  },
});
