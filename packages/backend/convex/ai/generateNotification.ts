import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  getAnthropicClient,
  extractTextFromResponse,
  NOTIFICATION_MODEL,
  thinkingOff,
} from "./providers/anthropic";
import { buildNotificationPrompt } from "./prompts/notificationWriter";
import { renderSemanticProfile } from "../semanticProfiles";
import {
  pickTemplate,
  pickFallbackTemplate,
  shouldSubstituteAffirmation,
  type NotificationTemplateType,
} from "./prompts/notificationTemplates";

const COLD_START_THRESHOLD = 3;

/**
 * Generate personalized notification copy via Haiku, or fall back to
 * curated templates for cold-start users (<3 sessions).
 *
 * Designed to be scheduled by notificationTriggers mutations.
 */
export const generate = internalAction({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    notificationType: v.union(
      v.literal("gentle_return"),
      v.literal("pattern_nudge")
    ),
    triggerReason: v.string(),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.notifications.loadGenerationContext,
      { emotionalProfileId: args.emotionalProfileId }
    );

    if (!context) return;

    const { profile, preferences, lastSession, userLanguageTags, recentNotificationContent } = context;

    const reach = preferences?.notifications?.reach ?? "warm";
    const sessionCount = profile.sessionCount;

    // Reach-weighted: sometimes swap a re-engagement nudge for an affirmation
    // that doesn't reference the app at all. Breaks the gravitational pull of
    // every other template orbiting "come back".
    const effectiveType: NotificationTemplateType = shouldSubstituteAffirmation(
      reach,
      args.notificationType
    )
      ? "affirmation"
      : args.notificationType;

    // Cold-start path: no personalization until we have enough sessions
    if (sessionCount < COLD_START_THRESHOLD) {
      const { content, generatedBy } = pickTemplate(
        reach,
        effectiveType,
        recentNotificationContent
      );

      await ctx.runMutation(internal.notifications.schedule, {
        emotionalProfileId: args.emotionalProfileId,
        type: effectiveType,
        content,
        triggerReason: args.triggerReason,
        scheduledFor: args.scheduledFor,
        reachUsed: reach,
        patternContextUsed: false,
        generatedBy,
      });
      return;
    }

    // Personalized path: build context and call Haiku
    const now = Date.now();
    const hoursSinceLastSession = profile.lastSessionAt
      ? (now - profile.lastSessionAt) / (1000 * 60 * 60)
      : 48;

    // Prefer the semantic profile's narrative (recurring themes, calibration,
    // trajectory) when it exists; the statistical tags below fold in beneath
    // it as a recency signal. Null pre-v1 (Reflection Agent writes v1 at 5
    // sessions / 7 active days) — same split as quotesDistiller.ts / context.ts.
    const semanticProfileDoc = await ctx.runQuery(
      internal.semanticProfiles.getCurrent,
      { emotionalProfileId: args.emotionalProfileId }
    );
    const renderedProfile = semanticProfileDoc
      ? renderSemanticProfile(semanticProfileDoc)
      : null;

    const notificationCtx = {
      notificationType: effectiveType,
      reach,
      sessionCount,
      currentStreak: profile.currentStreak,
      hoursSinceLastSession,
      dominantEmotionTags: profile.dominantEmotionTags.slice(0, 3),
      userLanguageTags,
      typicalUsagePattern: profile.typicalUsagePattern ?? null,
      lastSessionMood: (lastSession?.postSessionMood as "lighter" | "same" | "heavier" | "unsure" | undefined) ?? null,
      lastMirrorConfirmation: (lastSession?.confirmationState as "confirmed" | "refined" | "gave_up" | "abandoned" | undefined) ?? null,
      semanticProfile: renderedProfile,
    };

    const patternContextUsed =
      userLanguageTags.length > 0 || profile.dominantEmotionTags.length > 0;

    let content: string;
    let generatedBy: "haiku_personalized" | "template_cold_start" | "template_fallback";

    try {
      const anthropic = getAnthropicClient();
      const prompt = buildNotificationPrompt(notificationCtx);

      const response = await anthropic.messages.create({
        model: NOTIFICATION_MODEL,
        max_tokens: 120,
        thinking: thinkingOff(NOTIFICATION_MODEL),
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      });

      const raw = extractTextFromResponse(response).trim();

      // Validate: must be non-empty and within length limit
      if (raw && raw.length <= 120) {
        content = raw;
        generatedBy = "haiku_personalized";
      } else {
        console.warn("[generateNotification] AI response invalid; using template fallback", {
          rawLength: raw.length,
          requestId: response._request_id,
          reach,
          effectiveType,
        });
        const fallback = pickFallbackTemplate(reach, effectiveType, recentNotificationContent);
        content = fallback.content;
        generatedBy = fallback.generatedBy;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = err != null && typeof err === "object" && "status" in err
        ? (err as { status: unknown }).status
        : undefined;
      console.error("[generateNotification] Anthropic call failed; using template fallback", {
        message,
        ...(status !== undefined && { status }),
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack : undefined,
        emotionalProfileId: args.emotionalProfileId,
      });
      const fallback = pickFallbackTemplate(reach, effectiveType, recentNotificationContent);
      content = fallback.content;
      generatedBy = fallback.generatedBy;
    }

    await ctx.runMutation(internal.notifications.schedule, {
      emotionalProfileId: args.emotionalProfileId,
      type: effectiveType,
      content,
      triggerReason: args.triggerReason,
      scheduledFor: args.scheduledFor,
      reachUsed: reach,
      patternContextUsed,
      generatedBy,
    });
  },
});
