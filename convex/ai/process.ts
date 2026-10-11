import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  getAnthropicClient,
  extractTextFromResponse,
  CLASSIFIER_VERSION,
  ARTICULATOR_MODEL,
  ARTICULATOR_VERSION,
  thinkingOff,
} from "./providers/anthropic";
import { moderationCache, classifierCache } from "./cached";
import { MODERATION_UNAVAILABLE } from "./providers/moderation";
import { buildClassifierPrompt } from "./prompts/classifier";
import { buildArticulatorPrompt, hasMetaNarration } from "./prompts/articulator";
import { applyAudioFence } from "./prompts/mirrorAudioTags";
import { evaluateSafeguard, resolveSupportNeed } from "./safeguard";
import { decideMirrorOutcome, resolveMirrorTone } from "./mirrorPlan";
import { EPISODIC_CONNECT_FLOOR } from "./routing";
import { scheduleMirrorAudio } from "./tts";
import {
  buildArticulatorPatternSummary,
  buildPatternSummary,
  collectRecentMirrors,
} from "./helpers/patternSummary";

import { rateLimiter, AI_MIRROR_LIMITS_PLUS } from "../lib/rateLimits";
import { posthog } from "../posthog";
import {
  searchEpisodicMemory,
  type EpisodicSearch,
} from "./helpers/episodicSearch";

import type { SessionContext } from "./context";

const FALLBACK_MIRROR = "I hear you, and what you're feeling matters.";

/**
 * Main AI orchestrator for mirror generation.
 *
 * Pipeline: context → parallel(moderation, classification) → safeguard
 *   → articulation → deliver mirror + store metadata + escalation
 */
export const generateMirror = internalAction({
  args: {
    sessionId: v.id("sessions"),
    rawText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let session:
      | {
          entryType?: string;
          timeOfDay?: string;
          sessionMode?: "day" | "night";
          emotionalProfileId: string;
          [key: string]: unknown;
        }
      | undefined;
    try {
      // Load full context (single DB transaction)
      const context: SessionContext = await ctx.runQuery(
        internal.ai.context.buildSessionContext,
        { sessionId: args.sessionId },
      );

      // Rate limit AI requests (main cost control)
      const { ok, retryAfter } = await rateLimiter.limit(
        ctx,
        "aiMirrorRequest",
        {
          key: context.session.emotionalProfileId as string,
          ...(context.isPremium ? { config: AI_MIRROR_LIMITS_PLUS } : {}),
        },
      );

      if (!ok) {
        const minutes = Math.ceil((retryAfter ?? 0) / 60000);
        const retryText =
          minutes > 0
            ? `Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`
            : "Try again in a few minutes.";

        await ctx.runMutation(internal.sessions.failSession, {
          sessionId: args.sessionId,
          errorMessage: `You've reached the limit for reflections. ${retryText}`,
        });
        await posthog.capture(ctx, {
          distinctId: context.session.emotionalProfileId as string,
          event: "mirror_rate_limited",
          properties: { retryAfterMs: retryAfter ?? 0 },
        });
        return null;
      }

      // Build pattern summaries (pure functions). The classifier gets
      // the full variant (its only historical context); the articulator
      // gets the slim emotion-signal variant — longitudinal identity
      // reaches it via the semantic profile block instead.
      const mirrorTone = resolveMirrorTone(
        context.preferences?.mirrorTone,
        context.isPremium,
      );
      const patternSummary = buildPatternSummary({
        profile: context.profile,
        recentMetadata: context.recentMetadata,
        recentSessions: context.recentSessions,
        isFirstSession: context.isFirstSession,
        mirrorTone,
      });
      const articulatorPatternSummary = buildArticulatorPatternSummary({
        recentMetadata: context.recentMetadata,
        isFirstSession: context.isFirstSession,
      });
      console.log("pattern Summary ", patternSummary);

      // Parallel: moderation + classification (both cached)
      const anthropic = getAnthropicClient();

      session = context.session as {
        entryType?: string;
        timeOfDay?: string;
        sessionMode?: "day" | "night";
        emotionalProfileId: string;
        [key: string]: unknown;
      };

      const classifierPrompt = buildClassifierPrompt(
        args.rawText,
        patternSummary,
        context.isFirstSession,
        session.entryType ?? "open_prompt",
        session.timeOfDay,
      );
      console.log("classifier prompt ", classifierPrompt);

      // Fetch moderation + classification + episodic recall in parallel.
      // Episodic recall (Cognition Layer §1.3): top-K past composites
      // from the user's personal namespace, matched raw-to-raw against
      // tonight's input. Best-effort — memory failing must never block
      // the mirror.
      const [moderationResult, classification, episodic] =
        await Promise.all([
          moderationCache
            .fetch(ctx, { text: args.rawText })
            .catch(() => MODERATION_UNAVAILABLE),
          classifierCache.fetch(ctx, {
            systemPrompt: classifierPrompt.system,
            userPrompt: classifierPrompt.user,
          }),
          context.isFirstSession
            ? Promise.resolve({ matches: [] } as EpisodicSearch)
            : searchEpisodicMemory(
                ctx,
                session.emotionalProfileId,
                args.sessionId,
                args.rawText,
              ),
        ]);
      const episodicMatches = episodic.matches;
      const episodicRecall = episodicMatches.map((m) => m.text);

      // 5. Evaluate safeguard (rule engine, no LLM)
      const safeguard = evaluateSafeguard(
        classification,
        moderationResult,
        context.recentMetadata,
      );
      console.log("safeguard ", safeguard);

      // 5a. If content should be rejected, fail the session
      if (safeguard.shouldReject) {
        await ctx.runMutation(internal.sessions.failSession, {
          sessionId: args.sessionId,
          errorMessage: safeguard.rejectionReason ?? "content_policy_violation",
        });
        await posthog.capture(ctx, {
          distinctId: session.emotionalProfileId,
          event: "mirror_content_rejected",
          properties: {
            rejectionReason: safeguard.rejectionReason ?? "content_policy_violation",
          },
        });
        return null;
      }

      // Decide the outcome (pure — all routing rules in one place).
      // Claim strength stays deterministic rule-code: the hot path
      // never gets agentic.
      const plan = decideMirrorOutcome({
        rawMirrorTone: context.preferences?.mirrorTone,
        isPremium: context.isPremium,
        classification,
        safeguard,
        entryType: session.entryType ?? "open_prompt",
        episodicTopScore: episodic.topScore,
        profileReachedToday: context.profileReachedToday,
      });

      // 6. Articulate mirror (Sonnet)
      const recentMirrors = collectRecentMirrors(context.recentSessions);

      let mirrorText: string;
      try {
        const articulatorPrompt = buildArticulatorPrompt({
          rawInput: args.rawText,
          classification,
          patternSummary: articulatorPatternSummary,
          safeguardLevel: safeguard.level,
          mirrorTone,
          isFirstSession: context.isFirstSession,
          recentMirrors,
          entryType: session.entryType ?? "open_prompt",
          inputDuration: context.session.inputDuration as number | undefined,
          freezeOccurred: context.session.freezeOccurred as boolean | undefined,
          sessionMode: session.sessionMode,
          spaceName: context.preferences?.spaceName,
          semanticProfile: context.semanticProfile,
          episodicRecall,
          claimStrength: plan.claimStrength,
          useAudioTags: context.isPremium,
          intakeSignals: context.intakeSignals,
        });

        const mirrorResponse = await anthropic.messages.create({
          model: ARTICULATOR_MODEL,
          max_tokens: 300,
          thinking: thinkingOff(ARTICULATOR_MODEL),
          system: articulatorPrompt.system,
          messages: [{ role: "user", content: articulatorPrompt.user }],
        });

        mirrorText = extractTextFromResponse(mirrorResponse).trim();

        if (!mirrorText || hasMetaNarration(mirrorText)) {
          mirrorText = FALLBACK_MIRROR;
        }
      } catch {
        // Articulation failed — deliver fallback but still store classification
        mirrorText = FALLBACK_MIRROR;
      }

      // Xolace+ audio tags (when applied) live only in the TTS input — the
      // stored/displayed mirror, recentMirrors, and pattern context all read
      // the stripped text so a tag never leaks into anything but speech.
      const isFallback = mirrorText === FALLBACK_MIRROR;
      const { ttsText, displayText } = applyAudioFence({
        mirrorText,
        isFallback,
        isPremium: context.isPremium,
      });
      mirrorText = displayText;

      // Deliver mirror (include escalation flag atomically so the
      // client sees both state and escalationTriggered in one update)
      await ctx.runMutation(internal.sessions.deliverMirror, {
        sessionId: args.sessionId,
        mirrorText,
        mirrorModelVersion: ARTICULATOR_VERSION,
        toneUsed: plan.tone,
        safeguardLevel: safeguard.level,
        ...(plan.isEscalation
          ? {
              escalationTriggered: true,
              escalationResources: safeguard.resourcesPresented,
            }
          : {}),
        ...(plan.requiresFollowUp ? { requiresFollowUp: true } : {}),
        // A fallback mirror names no gap, so it must not burn the profile's
        // one reach for the day, wear the "Recommended" pill, or hand Loop #3
        // a demotion — all three key off gapNamed.
        ...(plan.claimStrength === "reaching" && !isFallback
          ? { gapNamed: true }
          : {}),
      });
      await posthog.capture(ctx, {
        distinctId: session.emotionalProfileId,
        event: "mirror_delivered",
        properties: {
          // §9.4: the gate's own inputs ride every delivery, so "would this
          // have reached?" is computable at read time on non-reaching sessions
          // too — that is what makes the pre/post window (§9.3) a control.
          sessionId: args.sessionId,
          specificity: classification.specificity,
          memoryConnected:
            episodic.topScore !== undefined &&
            episodic.topScore >= EPISODIC_CONNECT_FLOOR,
          episodicTopScore: episodic.topScore ?? null,
          entryType: session.entryType ?? "open_prompt",
          toneUsed: plan.tone,
          claimStrength: plan.claimStrength,
          safeguardLevel: safeguard.level,
          escalationTriggered: plan.isEscalation,
          usedFallback: mirrorText === FALLBACK_MIRROR,
          isFirstSession: context.isFirstSession,
          sessionMode: session.sessionMode ?? "day",
        },
      });

      // Schedule TTS generation (fire-and-forget, non-blocking)
      await scheduleMirrorAudio(ctx, {
        sessionId: args.sessionId,
        ttsText,
        isFallback,
        tone: plan.tone,
        isPremium: context.isPremium,
        voice: context.preferences?.voice as string | undefined,
      });

      // Store emotional metadata
      await ctx.runMutation(internal.emotionalMetadata.store, {
        sessionId: args.sessionId,
        emotionalProfileId: session.emotionalProfileId as ReturnType<
          typeof v.id<"emotional_profiles">
        >["type"],
        classifierVersion: CLASSIFIER_VERSION,
        primaryEmotion: classification.primaryEmotion,
        primaryEmotionConfidence: classification.primaryEmotionConfidence,
        granularLabel: classification.granularLabel,
        secondaryEmotion: classification.secondaryEmotion,
        intensity: classification.intensity,
        specificity: classification.specificity,
        thematicTags: classification.thematicTags,
        userLanguageTags: classification.userLanguageTags,
        temporalContext: classification.temporalContext,
        riskFlag: plan.riskFlag,
        safeguardLevel: safeguard.level,
        ...(safeguard.triggerType
          ? { safeguardTrigger: safeguard.triggerType }
          : {}),
        episodicMatchKeys: episodicMatches.map((m) => m.key),
        // Spread, not `?? 0`: absent means no search ran or nothing came back,
        // and a zero would read as a genuine (terrible) score at calibration.
        ...(episodic.topScore !== undefined
          ? { episodicTopScore: episodic.topScore }
          : {}),
        ...(context.semanticProfileVersion !== null
          ? { profileVersion: context.semanticProfileVersion }
          : {}),
        ...(classification.followUpReason
          ? { followUpReason: classification.followUpReason }
          : {}),
        supportNeed: resolveSupportNeed(
          classification.supportNeed,
          safeguard.level,
        ),
      });

      // Look up the exercise the plan matched.
      const matched = await ctx.runQuery(internal.exercises.getByTitle, {
        title: plan.exerciseTitle,
      });
      if (matched) {
        await ctx.runMutation(internal.exercises.setMatched, {
          sessionId: args.sessionId,
          matchedExerciseId: matched._id,
        });

        // Slot-fill — fire-and-forget so it doesn't block mirror delivery.
        const slotKeys = [
          ...new Set(
            matched.steps.flatMap(
              (s: { slotKeys?: string[] }) => s.slotKeys ?? [],
            ),
          ),
        ];
        if (slotKeys.length > 0) {
          await ctx.scheduler.runAfter(0, internal.ai.slotFill.fillSlots, {
            sessionId: args.sessionId,
            exerciseTitle: plan.exerciseTitle,
            slotKeys,
            mirrorText,
            userLanguageTags: classification.userLanguageTags,
            primaryEmotion: classification.primaryEmotion,
          });
        }
      }

      // Schedule speculative distillation (for reflection pool)
      // Skip if mirror is the fallback — nothing meaningful to distill.
      // Skip entirely for crisis sessions
      if (mirrorText !== FALLBACK_MIRROR && !plan.isCrisis) {
        await ctx.scheduler.runAfter(
          0,
          internal.jobs.reflectionDistiller.distill,
          {
            sessionId: args.sessionId,
            rawText: args.rawText,
            mirrorText,
            primaryEmotion: classification.primaryEmotion,
            granularLabel: classification.granularLabel,
            intensity: classification.intensity,
            thematicTags: classification.thematicTags,
            userLanguageTags: classification.userLanguageTags,
          },
        );
      }

      // Schedule episodic memory ingestion.
      // Keyed by sessionId → idempotent replace. Delayed slightly so
      // the speculative distiller has usually written distilledText
      // by the time the composite is built. ingestSession itself
      // handles crisis (metadata-only) and the personal-memory toggle.
      await ctx.scheduler.runAfter(
        30_000,
        internal.episodicMemory.ingestSession,
        { sessionId: args.sessionId },
      );

      // Create escalation event if needed
      if (plan.isEscalation && safeguard.triggerType) {
        await ctx.runMutation(internal.escalation.create, {
          emotionalProfileId: session.emotionalProfileId as ReturnType<
            typeof v.id<"emotional_profiles">
          >["type"],
          sessionId: args.sessionId,
          triggerType: safeguard.triggerType,
          triggerConfidence: safeguard.triggerConfidence,
          triggerEvidence: safeguard.triggerEvidence,
          actionTaken: safeguard.actionTaken,
          resourcesPresented: safeguard.resourcesPresented,
        });
      }
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? sanitizeAiError(error)
          : "Something interrupted this moment. You can try again when you're ready.";

      await ctx.runMutation(internal.sessions.failSession, {
        sessionId: args.sessionId,
        errorMessage,
      });
      await posthog.capture(ctx, {
        distinctId: session?.emotionalProfileId ?? (args.sessionId as string),
        event: "mirror_generation_failed",
        properties: { errorType: classifyAiError(error) },
      });
      return null;
    }
  },
});

function sanitizeAiError(error: Error): string {
  const msg = error.message;
  if (msg.includes("overloaded_error") || msg.startsWith("529")) {
    return "The space is a little full right now. Take a breath and try again in a moment.";
  }
  if (msg.includes("rate_limit") || msg.startsWith("429")) {
    return "The space is a little full right now. Take a breath and try again in a moment.";
  }
  return "Something interrupted this moment. You can try again when you're ready.";
}

function classifyAiError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  const msg = error.message;
  if (msg.includes("overloaded_error") || msg.startsWith("529")) return "anthropic_overloaded";
  if (msg.includes("rate_limit") || msg.startsWith("429")) return "anthropic_rate_limit";
  if (msg.includes("context") || msg.startsWith("buildSessionContext")) return "context_load_failed";
  return "unknown";
}
