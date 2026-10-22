import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { ExerciseSimilarity } from "../exercises/match";
import { AI_MIRROR_LIMITS_PLUS, rateLimiter } from "../lib/rateLimits";
import { posthog } from "../posthog";
import { classifierCache, moderationCache } from "./cached";
import type { SessionContext } from "./context";
import { searchExercises } from "./exercises/embed";
import { embedSessionText } from "./helpers/embedSessionText";
import {
	type EpisodicSearch,
	searchEpisodicMemory,
} from "./helpers/episodicSearch";
import {
	buildArticulatorPatternSummary,
	buildPatternSummary,
	collectRecentMirrors,
} from "./helpers/patternSummary";
import { decideMirrorOutcome, resolveMirrorTone } from "./mirrorPlan";
import {
	buildArticulatorPrompt,
	hasMetaNarration,
} from "./prompts/articulator";
import { buildClassifierPrompt } from "./prompts/classifier";
import { applyAudioFence } from "./prompts/mirrorAudioTags";
import {
	ARTICULATOR_MODEL,
	ARTICULATOR_VERSION,
	CLASSIFIER_VERSION,
	extractTextFromResponse,
	getAnthropicClient,
	thinkingOff,
} from "./providers/anthropic";
import { MODERATION_UNAVAILABLE } from "./providers/moderation";
import { EPISODIC_CONNECT_FLOOR } from "./routing";
import {
	evaluateSafeguard,
	keepsWordsPrivate,
	resolveSupportNeed,
	type TalkPeak,
	withTalkPeak,
} from "./safeguard";
import { scheduleMirrorAudio } from "./tts";

const FALLBACK_MIRROR = "I hear you, and what you're feeling matters.";

/**
 * Main AI orchestrator for mirror generation.
 *
 * Pipeline: context → parallel(moderation, classification) → safeguard
 *   → articulation → deliver mirror + store metadata + escalation
 */
export const generateMirror = internalAction({
	args: {
		rawText: v.string(),
		sessionId: v.id("sessions"),
	},
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
				{ sessionId: args.sessionId }
			);

			// Rate limit AI requests (main cost control)
			const { ok, retryAfter } = await rateLimiter.limit(
				ctx,
				"aiMirrorRequest",
				{
					key: context.session.emotionalProfileId as string,
					...(context.isPremium ? { config: AI_MIRROR_LIMITS_PLUS } : {}),
				}
			);

			if (!ok) {
				const minutes = Math.ceil((retryAfter ?? 0) / 60_000);
				const retryText =
					minutes > 0
						? `Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`
						: "Try again in a few minutes.";

				await ctx.runMutation(internal.sessions.failSession, {
					errorMessage: `You've reached the limit for reflections. ${retryText}`,
					sessionId: args.sessionId,
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
				context.isPremium
			);
			const patternSummary = buildPatternSummary({
				isFirstSession: context.isFirstSession,
				mirrorTone,
				profile: context.profile,
				recentMetadata: context.recentMetadata,
				recentSessions: context.recentSessions,
			});
			const articulatorPatternSummary = buildArticulatorPatternSummary({
				isFirstSession: context.isFirstSession,
				recentMetadata: context.recentMetadata,
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
				session.timeOfDay
			);
			console.log("classifier prompt ", classifierPrompt);

			// Fetch moderation + classification + episodic recall in parallel.
			// Episodic recall (Cognition Layer §1.3): top-K past composites
			// from the user's personal namespace, matched raw-to-raw against
			// tonight's input. Best-effort — memory failing must never block
			// the mirror. The same vector ranks the exercises (#569).
			const profileId = session.emotionalProfileId;
			const [moderationResult, classification, [episodic, exerciseSimilarity]] =
				await Promise.all([
					moderationCache
						.fetch(ctx, { text: args.rawText })
						.catch(() => MODERATION_UNAVAILABLE),
					classifierCache.fetch(ctx, {
						systemPrompt: classifierPrompt.system,
						userPrompt: classifierPrompt.user,
					}),
					context.isFirstSession
						? Promise.resolve<[EpisodicSearch, ExerciseSimilarity | undefined]>(
								[{ matches: [] }, undefined]
							)
						: embedSessionText(args.rawText).then((vector) =>
								Promise.all<
									[
										Promise<EpisodicSearch>,
										Promise<ExerciseSimilarity | undefined>,
									]
								>([
									searchEpisodicMemory(ctx, profileId, args.sessionId, vector),
									searchExercises(ctx, vector),
								])
							),
				]);
			const episodicMatches = episodic.matches;
			const episodicRecall = episodicMatches.map((m) => m.text);

			// 5. Evaluate safeguard (rule engine, no LLM). A talk's level is the
			// higher of this end verdict and its live peak (#599).
			const safeguard = withTalkPeak(
				evaluateSafeguard(
					classification,
					moderationResult,
					context.recentMetadata
				),
				session.talkSafety as TalkPeak | undefined
			);
			console.log("safeguard ", safeguard);

			// 5a. If content should be rejected, fail the session
			if (safeguard.shouldReject) {
				await ctx.runMutation(internal.sessions.failSession, {
					errorMessage: safeguard.rejectionReason ?? "content_policy_violation",
					sessionId: args.sessionId,
				});
				await posthog.capture(ctx, {
					distinctId: session.emotionalProfileId,
					event: "mirror_content_rejected",
					properties: {
						rejectionReason:
							safeguard.rejectionReason ?? "content_policy_violation",
					},
				});
				return null;
			}

			// Decide the outcome (pure — all routing rules in one place).
			// Claim strength stays deterministic rule-code: the hot path
			// never gets agentic.
			const plan = decideMirrorOutcome({
				classification,
				entryType: session.entryType ?? "open_prompt",
				episodicTopScore: episodic.topScore,
				exerciseSimilarity,
				isPremium: context.isPremium,
				profileReachedToday: context.profileReachedToday,
				rawMirrorTone: context.preferences?.mirrorTone,
				safeguard,
			});

			// 6. Articulate mirror (Sonnet). Tell the client first so its waiting
			// copy follows the pipeline; a copy hint must never cost the mirror.
			await ctx
				.runMutation(internal.sessions.setProcessingStage, {
					sessionId: args.sessionId,
					stage:
						(episodic.topScore ?? 0) >= EPISODIC_CONNECT_FLOOR
							? "connecting"
							: "writing",
				})
				.catch(() => {});
			const recentMirrors = collectRecentMirrors(context.recentSessions);

			let mirrorText: string;
			try {
				const articulatorPrompt = buildArticulatorPrompt({
					claimStrength: plan.claimStrength,
					classification,
					entryType: session.entryType ?? "open_prompt",
					episodicRecall,
					freezeOccurred: context.session.freezeOccurred as boolean | undefined,
					inputDuration: context.session.inputDuration as number | undefined,
					intakeSignals: context.intakeSignals,
					isFirstSession: context.isFirstSession,
					mirrorTone,
					patternSummary: articulatorPatternSummary,
					rawInput: args.rawText,
					recentMirrors,
					safeguardLevel: safeguard.level,
					semanticProfile: context.semanticProfile,
					sessionMode: session.sessionMode,
					spaceName: context.preferences?.spaceName,
					useAudioTags: context.isPremium,
				});

				const mirrorResponse = await anthropic.messages.create({
					max_tokens: 300,
					messages: [{ content: articulatorPrompt.user, role: "user" }],
					model: ARTICULATOR_MODEL,
					system: articulatorPrompt.system,
					thinking: thinkingOff(ARTICULATOR_MODEL),
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
				isFallback,
				isPremium: context.isPremium,
				mirrorText,
			});
			mirrorText = displayText;

			// Deliver mirror (include escalation flag atomically so the
			// client sees both state and escalationTriggered in one update)
			await ctx.runMutation(internal.sessions.deliverMirror, {
				mirrorModelVersion: ARTICULATOR_VERSION,
				mirrorText,
				safeguardLevel: safeguard.level,
				sessionId: args.sessionId,
				toneUsed: plan.tone,
				...(plan.isEscalation
					? {
							escalationResources: safeguard.resourcesPresented,
							escalationTriggered: true,
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
					claimStrength: plan.claimStrength,
					entryType: session.entryType ?? "open_prompt",
					episodicTopScore: episodic.topScore ?? null,
					escalationTriggered: plan.isEscalation,
					// Tunes SIMILARITY_FLOOR.exercise; null = no vector, a failed
					// search, or nothing indexed — never a fake score.
					exerciseTopScore:
						exerciseSimilarity && Object.keys(exerciseSimilarity).length > 0
							? Math.max(...Object.values(exerciseSimilarity))
							: null,
					isFirstSession: context.isFirstSession,
					memoryConnected:
						episodic.topScore !== undefined &&
						episodic.topScore >= EPISODIC_CONNECT_FLOOR,
					safeguardLevel: safeguard.level,
					// §9.4: the gate's own inputs ride every delivery, so "would this
					// have reached?" is computable at read time on non-reaching sessions
					// too — that is what makes the pre/post window (§9.3) a control.
					sessionId: args.sessionId,
					sessionMode: session.sessionMode ?? "day",
					specificity: classification.specificity,
					toneUsed: plan.tone,
					usedFallback: mirrorText === FALLBACK_MIRROR,
				},
			});

			// Schedule TTS generation (fire-and-forget, non-blocking)
			await scheduleMirrorAudio(ctx, {
				isFallback,
				isPremium: context.isPremium,
				sessionId: args.sessionId,
				tone: plan.tone,
				ttsText,
				voice: context.preferences?.voice as string | undefined,
			});

			// Store emotional metadata
			await ctx.runMutation(internal.emotionalMetadata.store, {
				classifierVersion: CLASSIFIER_VERSION,
				emotionalProfileId: session.emotionalProfileId as ReturnType<
					typeof v.id<"emotional_profiles">
				>["type"],
				granularLabel: classification.granularLabel,
				intensity: classification.intensity,
				primaryEmotion: classification.primaryEmotion,
				primaryEmotionConfidence: classification.primaryEmotionConfidence,
				riskFlag: plan.riskFlag,
				safeguardLevel: safeguard.level,
				secondaryEmotion: classification.secondaryEmotion,
				sessionId: args.sessionId,
				specificity: classification.specificity,
				temporalContext: classification.temporalContext,
				thematicTags: classification.thematicTags,
				userLanguageTags: classification.userLanguageTags,
				...(safeguard.triggerType
					? { safeguardTrigger: safeguard.triggerType }
					: {}),
				episodicMatchKeys: episodicMatches.map((m) => m.key),
				// Spread, not `?? 0`: absent means no search ran or nothing came back,
				// and a zero would read as a genuine (terrible) score at calibration.
				...(episodic.topScore === undefined
					? {}
					: { episodicTopScore: episodic.topScore }),
				...(context.semanticProfileVersion === null
					? {}
					: { profileVersion: context.semanticProfileVersion }),
				...(classification.followUpReason
					? { followUpReason: classification.followUpReason }
					: {}),
				supportNeed: resolveSupportNeed(
					classification.supportNeed,
					safeguard.level
				),
			});

			// Look up the exercise the plan matched.
			const matched = await ctx.runQuery(internal.exercises.getByTitle, {
				title: plan.exerciseTitle,
			});
			if (matched) {
				await ctx.runMutation(internal.exercises.setMatched, {
					exerciseSimilarity,
					matchedExerciseId: matched._id,
					sessionId: args.sessionId,
				});

				// Slot-fill — fire-and-forget so it doesn't block mirror delivery.
				const slotKeys = [
					...new Set(
						matched.steps.flatMap(
							(s: { slotKeys?: string[] }) => s.slotKeys ?? []
						)
					),
				];
				if (slotKeys.length > 0) {
					await ctx.scheduler.runAfter(0, internal.ai.slotFill.fillSlots, {
						exerciseTitle: plan.exerciseTitle,
						mirrorText,
						primaryEmotion: classification.primaryEmotion,
						sessionId: args.sessionId,
						slotKeys,
						userLanguageTags: classification.userLanguageTags,
					});
				}
			}

			// Schedule speculative distillation (for reflection pool)
			// Skip if mirror is the fallback — nothing meaningful to distill.
			// Skip entirely for crisis sessions, and a talk at elevated (#599).
			if (
				mirrorText !== FALLBACK_MIRROR &&
				!keepsWordsPrivate(session.entryType, safeguard.level)
			) {
				await ctx.scheduler.runAfter(
					0,
					internal.jobs.reflectionDistiller.distill,
					{
						granularLabel: classification.granularLabel,
						intensity: classification.intensity,
						mirrorText,
						primaryEmotion: classification.primaryEmotion,
						rawText: args.rawText,
						sessionId: args.sessionId,
						thematicTags: classification.thematicTags,
						userLanguageTags: classification.userLanguageTags,
					}
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
				{ sessionId: args.sessionId }
			);

			// Create escalation event if needed
			if (plan.isEscalation && safeguard.triggerType) {
				await ctx.runMutation(internal.escalation.create, {
					actionTaken: safeguard.actionTaken,
					emotionalProfileId: session.emotionalProfileId as ReturnType<
						typeof v.id<"emotional_profiles">
					>["type"],
					resourcesPresented: safeguard.resourcesPresented,
					sessionId: args.sessionId,
					triggerConfidence: safeguard.triggerConfidence,
					triggerEvidence: safeguard.triggerEvidence,
					triggerType: safeguard.triggerType,
				});
			}
			return null;
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? sanitizeAiError(error)
					: "Something interrupted this moment. You can try again when you're ready.";

			await ctx.runMutation(internal.sessions.failSession, {
				errorMessage,
				sessionId: args.sessionId,
			});
			await posthog.capture(ctx, {
				distinctId: session?.emotionalProfileId ?? (args.sessionId as string),
				event: "mirror_generation_failed",
				properties: { errorType: classifyAiError(error) },
			});
			return null;
		}
	},
	returns: v.null(),
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
	if (!(error instanceof Error)) {
		return "unknown";
	}
	const msg = error.message;
	if (msg.includes("overloaded_error") || msg.startsWith("529")) {
		return "anthropic_overloaded";
	}
	if (msg.includes("rate_limit") || msg.startsWith("429")) {
		return "anthropic_rate_limit";
	}
	if (msg.includes("context") || msg.startsWith("buildSessionContext")) {
		return "context_load_failed";
	}
	return "unknown";
}
