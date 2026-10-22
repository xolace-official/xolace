import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import type { ExerciseSimilarity } from "../exercises/match";
import { posthog } from "../posthog";
import { MAX_TURNS } from "../sessionTurns";
import { classifierCache, moderationCache } from "./cached";
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
import { resolveMirrorTone } from "./mirrorPlan";
import {
	buildAccumulatedInput,
	type RefinementTurn,
} from "./prompts/accumulatedInput";
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
import { EPISODIC_CONNECT_FLOOR, routeClaimStrength } from "./routing";
import { evaluateSafeguard, resolveSupportNeed } from "./safeguard";
import { scheduleMirrorAudio } from "./tts";

const FALLBACK_MIRROR =
	"I hear you more clearly now. What you're feeling deserves to be seen.";

/**
 * Handle clarification for refinement turns ("Not quite" / "Say more").
 *
 * A refinement builds on what came before (docs/confidence-aware-mirroring.md
 * §5): classifier and articulator both read the original input plus every
 * turn's added words, turn-marked; episodic memory is searched again against
 * that accumulated input; and the Understanding row is replaced with the
 * final read.
 *
 * Text added on a refinement turn re-runs moderation + safeguard on the
 * accumulated input with the same rejection / escalation consequences as the
 * initial pass. A zero-added-text turn keeps the verdict already on the row.
 */
export const handleClarification = internalAction({
	args: {
		additionalRawText: v.optional(v.string()),
		sessionId: v.id("sessions"),
		turnNumber: v.number(),
	},
	handler: async (ctx, args) => {
		let session:
			| {
					mirrorText?: string;
					emotionalProfileId: string;
					entryType?: string;
					inputDuration?: number;
					freezeOccurred?: boolean;
					escalationTriggered?: boolean;
					gapNamed?: boolean;
					[key: string]: unknown;
			  }
			| undefined;
		try {
			// 1. Load full context (includes turns + current mirror)
			const context = await ctx.runQuery(
				internal.ai.context.buildSessionContext,
				{ sessionId: args.sessionId }
			);

			session = context.session as {
				mirrorText?: string;
				emotionalProfileId: string;
				entryType?: string;
				inputDuration?: number;
				freezeOccurred?: boolean;
				[key: string]: unknown;
			};

			// 2. Load existing emotional metadata for this session
			type MetadataType = {
				classifierVersion: string;
				primaryEmotion: string;
				primaryEmotionConfidence: number;
				granularLabel?: string;
				secondaryEmotion?: string;
				intensity: number;
				specificity: number;
				thematicTags: string[];
				userLanguageTags: string[];
				temporalContext?: "past_focused" | "present_focused" | "future_focused";
				episodicMatchKeys?: string[];
				episodicTopScore?: number;
				supportNeed?: "none" | "light" | "active";
				safeguardLevel?: "none" | "gentle" | "elevated" | "crisis";
			} | null;

			const metadata: MetadataType = await ctx.runQuery(
				internal.emotionalMetadata.getBySessionInternal,
				{ sessionId: args.sessionId }
			);

			// If no metadata exists (edge case), we can't refine properly
			if (!metadata) {
				await ctx.runMutation(internal.sessions.failSession, {
					errorMessage: "No classification found for refinement",
					sessionId: args.sessionId,
				});
				return;
			}

			// 3. This turn's feedback, and the turn-marked accumulated input both
			// prompts read (§5.1). The turn rows carry every earlier addition; the
			// action's own argument is the authority for this turn, since the row
			// may predate the client that started writing `userInput`.
			const turns = (context.turns as unknown as RefinementTurn[]).map((t) =>
				t.turnNumber === args.turnNumber && !t.userInput
					? { ...t, userInput: args.additionalRawText }
					: t
			);
			const currentTurn = turns.find((t) => t.turnNumber === args.turnNumber);
			const userFeedback = currentTurn?.userFeedback;
			const addedText = (currentTurn?.userInput ?? "").trim();

			const accumulatedInput = buildAccumulatedInput(
				(session.rawInput as string | undefined) ?? "",
				turns
			);

			// Real fence: same downgrade guard as the initial mirror (process.ts).
			const mirrorTone = resolveMirrorTone(
				context.preferences?.mirrorTone,
				context.isPremium
			);

			// 4. Re-classify against the accumulated input, and re-search episodic
			// memory (§5.2) — the detail that arrives on turn 2 may be exactly what
			// makes Tuesday relevant, and a frozen turn-1 "didn't connect" would
			// leave the reach permanently unearned. This does not re-open the reach:
			// one reach only still holds, via gapNamedThisSession below.
			//
			// Zero added text skips the classifier entirely: identical input, same
			// answer, and re-deriving what the Understanding already knows is not
			// licensed. `userFeedback` deliberately never reaches the classifier —
			// telling a precise analytical instrument that its last answer was
			// rejected invites it off a correct classification to please the user.
			const classifierPrompt =
				addedText.length > 0
					? buildClassifierPrompt(
							accumulatedInput,
							buildPatternSummary({
								isFirstSession: context.isFirstSession,
								mirrorTone,
								profile: context.profile,
								recentMetadata: context.recentMetadata,
								recentSessions: context.recentSessions,
							}),
							context.isFirstSession,
							session.entryType ?? "open_prompt",
							session.timeOfDay as string | undefined
						)
					: null;

			const profileId = session.emotionalProfileId;
			const [reclassified, [episodic, exerciseSimilarity], moderationResult] =
				await Promise.all([
					classifierPrompt
						? classifierCache
								.fetch(ctx, {
									systemPrompt: classifierPrompt.system,
									userPrompt: classifierPrompt.user,
								})
								// A classifier blip must not cost a mirror that already exists —
								// fall back to the classification the session already has.
								.catch(() => null)
						: Promise.resolve(null),
					// The same vector re-ranks the exercises (#569) when this turn added
					// words — otherwise swaps keep ranking against the original text.
					context.isFirstSession
						? Promise.resolve<[EpisodicSearch, ExerciseSimilarity | undefined]>(
								[{ matches: [] }, undefined]
							)
						: embedSessionText(accumulatedInput).then((vector) =>
								Promise.all<
									[
										Promise<EpisodicSearch>,
										Promise<ExerciseSimilarity | undefined>,
									]
								>([
									searchEpisodicMemory(ctx, profileId, args.sessionId, vector),
									addedText.length > 0
										? searchExercises(ctx, vector)
										: Promise.resolve(undefined),
								])
							),
					addedText.length > 0
						? moderationCache
								.fetch(ctx, { text: accumulatedInput })
								.catch(() => MODERATION_UNAVAILABLE)
						: Promise.resolve(null),
				]);

			const classification = reclassified ?? {
				followUpReason: undefined,
				granularLabel: metadata.granularLabel,
				intensity: metadata.intensity,
				primaryEmotion: metadata.primaryEmotion,
				primaryEmotionConfidence: metadata.primaryEmotionConfidence,
				requiresFollowUp: false,
				secondaryEmotion: metadata.secondaryEmotion,
				specificity: metadata.specificity,
				supportNeed: metadata.supportNeed ?? "none",
				temporalContext: metadata.temporalContext,
				thematicTags: metadata.thematicTags,
				userLanguageTags: metadata.userLanguageTags,
			};

			// 4.1. Safeguard on the accumulated input (same rule engine as
			// process.ts). Only when this turn added words — the initial verdict
			// already covers the unchanged input.
			const safeguard = moderationResult
				? evaluateSafeguard(
						classification,
						moderationResult,
						context.recentMetadata
					)
				: null;
			const safeguardLevel =
				safeguard?.level ?? metadata.safeguardLevel ?? "none";

			if (safeguard?.shouldReject) {
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
						turnNumber: args.turnNumber,
					},
				});
				return;
			}

			// Escalation is sticky: a session that escalated on the initial pass
			// stays escalated, and this turn can only add to that.
			const isEscalation =
				session.escalationTriggered === true ||
				safeguard?.isEscalation === true;

			// 5. Build the articulator prompt with refinement context.
			// Clarify only re-articulates, so it uses the slim articulator variant.
			const patternSummary = buildArticulatorPatternSummary({
				isFirstSession: context.isFirstSession,
				recentMetadata: context.recentMetadata,
			});

			const recentMirrors = collectRecentMirrors(context.recentSessions);

			// Claim strength on the refinement pass — the same single gate as the
			// initial mirror, with the full context it needs. The suppression guards
			// are re-evaluated here rather than assumed: relying on the client not
			// rendering "Say more" on an escalation screen would prop up a
			// server-side safety rule with a client-side fact.
			// A search that never ran says nothing about whether memory connected,
			// so the score the mirror was already built on stands — otherwise an
			// embedding outage would silently turn a connected session into a reach.
			const episodicTopScore = episodic.failed
				? metadata.episodicTopScore
				: episodic.topScore;

			// The claim strength of the mirror the user pressed on (§9.4). Same
			// inputs `deriveClaimStrength` served to the action row before this
			// turn, so the property joins to the press event's `claimStrength`
			// rather than to a second, differently-derived number.
			const respondingToClaimStrength = routeClaimStrength({
				atCap: args.turnNumber - 1 >= MAX_TURNS,
				confidence: metadata.primaryEmotionConfidence,
				entryType: session.entryType ?? "open_prompt",
				episodicTopScore: metadata.episodicTopScore,
				gapNamedThisSession: session.gapNamed === true,
				isEscalation: session.escalationTriggered === true,
				profileReachedToday: context.profileReachedToday,
				specificity: metadata.specificity,
				userFeedback: turns.find((t) => t.turnNumber === args.turnNumber - 1)
					?.userFeedback,
			});

			const claimStrength = routeClaimStrength({
				atCap: args.turnNumber >= MAX_TURNS,
				confidence: classification.primaryEmotionConfidence,
				entryType: session.entryType ?? "open_prompt",
				episodicTopScore,
				gapNamedThisSession: session.gapNamed === true,
				isEscalation,
				profileReachedToday: context.profileReachedToday,
				specificity: classification.specificity,
				userFeedback,
			});

			const articulatorPrompt = buildArticulatorPrompt({
				claimStrength,
				classification: {
					...classification,
					// The follow-up flag is a scheduling decision, not an articulation
					// input.
					requiresFollowUp: false,
				},
				entryType: session.entryType ?? "open_prompt",
				episodicRecall: episodic.matches.map((m) => m.text),
				existingMirror: session.mirrorText,
				freezeOccurred: session.freezeOccurred,
				inputDuration: session.inputDuration,
				intakeSignals: context.intakeSignals,
				isFirstSession: context.isFirstSession,
				mirrorTone,
				patternSummary,
				rawInput: accumulatedInput,
				recentMirrors,
				safeguardLevel,
				// Longitudinal Understanding: pass the semantic profile through so the
				// refinement is grounded in who this person is, matching process.ts.
				semanticProfile: context.semanticProfile,
				spaceName: context.preferences?.spaceName,
				turnCount: args.turnNumber,
				useAudioTags: context.isPremium,
				userFeedback,
			});

			// 5. Call Sonnet for revised mirror. Stage hint first (see process.ts).
			await ctx
				.runMutation(internal.sessions.setProcessingStage, {
					sessionId: args.sessionId,
					stage:
						(episodic.topScore ?? 0) >= EPISODIC_CONNECT_FLOOR
							? "connecting"
							: "writing",
				})
				.catch(() => {});
			const anthropic = getAnthropicClient();

			let revisedMirrorText: string;
			try {
				const response = await anthropic.messages.create({
					max_tokens: 300,
					messages: [{ content: articulatorPrompt.user, role: "user" }],
					model: ARTICULATOR_MODEL,
					system: articulatorPrompt.system,
					thinking: thinkingOff(ARTICULATOR_MODEL),
				});

				revisedMirrorText = extractTextFromResponse(response).trim();
				if (!revisedMirrorText || hasMetaNarration(revisedMirrorText)) {
					revisedMirrorText = FALLBACK_MIRROR;
				}
			} catch {
				revisedMirrorText = FALLBACK_MIRROR;
			}

			// Xolace+ audio tags live only in the TTS input (see applyAudioFence).
			const isFallback = revisedMirrorText === FALLBACK_MIRROR;
			const { ttsText, displayText } = applyAudioFence({
				isFallback,
				isPremium: context.isPremium,
				mirrorText: revisedMirrorText,
			});
			revisedMirrorText = displayText;

			// 6. Update the turn record with the revised mirror
			await ctx.runMutation(internal.sessionTurns.deliverRevisedMirror, {
				modelVersion: ARTICULATOR_VERSION,
				revisedMirrorText,
				sessionId: args.sessionId,
				turnNumber: args.turnNumber,
			});

			// 7. Update the session's displayed mirror
			await ctx.runMutation(internal.sessions.deliverMirror, {
				mirrorModelVersion: ARTICULATOR_VERSION,
				mirrorText: revisedMirrorText,
				sessionId: args.sessionId,
				toneUsed: mirrorTone,
				...(safeguard ? { safeguardLevel: safeguard.level } : {}),
				...(safeguard?.isEscalation
					? {
							escalationResources: safeguard.resourcesPresented,
							escalationTriggered: true,
						}
					: {}),
				// Same fence as the initial mirror: a fallback named no gap.
				...(claimStrength === "reaching" && !isFallback
					? { gapNamed: true }
					: {}),
				// Raise-only (§5.3): a re-classification may turn a follow-up on,
				// never off — a session that already scheduled a workflow must not be
				// left holding it against a disagreeing flag.
				...(reclassified?.requiresFollowUp ? { requiresFollowUp: true } : {}),
			});

			// 7.1. Replace the Understanding with the final read of this moment.
			// Every downstream consumer runs after the session ends and wants the
			// last word, not an audit trail.
			await ctx.runMutation(internal.emotionalMetadata.replaceForRefinement, {
				classifierVersion: reclassified
					? CLASSIFIER_VERSION
					: metadata.classifierVersion,
				granularLabel: classification.granularLabel,
				intensity: classification.intensity,
				primaryEmotion: classification.primaryEmotion,
				primaryEmotionConfidence: classification.primaryEmotionConfidence,
				secondaryEmotion: classification.secondaryEmotion,
				sessionId: args.sessionId,
				specificity: classification.specificity,
				temporalContext: classification.temporalContext,
				thematicTags: classification.thematicTags,
				userLanguageTags: classification.userLanguageTags,
				// Both episodic fields are replaced together, and only when the search
				// actually ran: an outage returning no matches must not wipe the
				// provenance Loop #3 reads at confirmation. Inside that, topScore is
				// spread rather than `?? 0` — a zero would read as a genuine (terrible)
				// score at calibration.
				...(episodic.failed
					? {}
					: {
							episodicMatchKeys: episodic.matches.map((m) => m.key),
							...(episodic.topScore === undefined
								? {}
								: { episodicTopScore: episodic.topScore }),
						}),
				...(reclassified?.followUpReason
					? { followUpReason: reclassified.followUpReason }
					: {}),
				// Refreshed only when this turn actually reclassified — zero-added-
				// text turns reuse the existing classification (§4 above) and must
				// not re-force a grade that already reflects the current safeguard
				// level.
				...(reclassified
					? {
							supportNeed: resolveSupportNeed(
								reclassified.supportNeed,
								safeguardLevel
							),
						}
					: {}),
				...(safeguard
					? {
							riskFlag: safeguard.riskFlag,
							safeguardLevel: safeguard.level,
							safeguardTrigger: safeguard.triggerType,
						}
					: {}),
			});

			// Scores ranked the original text; a failed search clears them so
			// ranking falls back to the refreshed classification alone.
			if (addedText.length > 0) {
				await ctx.runMutation(internal.exercises.setExerciseSimilarity, {
					exerciseSimilarity,
					sessionId: args.sessionId,
				});
			}

			// First escalation on this session lands the event; a session that
			// already escalated keeps the one it has.
			if (
				safeguard?.isEscalation &&
				safeguard.triggerType &&
				session.escalationTriggered !== true
			) {
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

			await posthog.capture(ctx, {
				distinctId: session.emotionalProfileId,
				event: "clarify_delivered",
				properties: {
					claimStrength,
					entryType: session.entryType ?? "open_prompt",
					escalationTriggered: isEscalation,
					hadAdditionalText: addedText.length > 0,
					isFirstSession: context.isFirstSession,
					reachAlreadySent: session.gapNamed === true,
					reclassified: reclassified !== null,
					respondingToClaimStrength,
					safeguardLevel,
					// §9.4: `sessionId` joins the press to this delivery (the primary
					// metric); `reachAlreadySent` separates a holding turn from a first
					// reach; `specificity` is the post-turn read, so the secondary
					// before/after delta is readable without a second event.
					sessionId: args.sessionId,
					specificity: classification.specificity,
					turnNumber: args.turnNumber,
					usedFallback: revisedMirrorText === FALLBACK_MIRROR,
					userFeedback: userFeedback ?? "not_quite",
				},
			});

			// 7.5. Replace TTS: delete old audio file and schedule fresh generation.
			await scheduleMirrorAudio(ctx, {
				isFallback,
				isPremium: context.isPremium,
				replaceExisting: true,
				sessionId: args.sessionId,
				tone: mirrorTone,
				ttsText,
				voice: context.preferences?.voice as string | undefined,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error during clarification";

			await ctx.runMutation(internal.sessions.failSession, {
				errorMessage,
				sessionId: args.sessionId,
			});
			await posthog.capture(ctx, {
				distinctId: session?.emotionalProfileId ?? (args.sessionId as string),
				event: "clarify_failed",
				properties: {
					errorType:
						error instanceof Error &&
						error.message.includes("No classification")
							? "missing_metadata"
							: "unknown",
					turnNumber: args.turnNumber,
				},
			});
		}
	},
	returns: v.null(),
});
