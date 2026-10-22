/**
 * The pure decision core of mirror generation. generateMirror gathers
 * inputs (context, classification, safeguard), asks decideMirrorOutcome
 * what should happen, then executes the plan — all routing rules live
 * here where they are unit-testable without Anthropic or Convex.
 * No I/O, no internal.* references. Default runtime.
 */

import {
	type ExerciseSimilarity,
	type ExerciseTitle,
	matchExercise,
} from "../exercises/match";
import type { ClassificationResult } from "./providers/anthropic";
import { type ClaimStrength, routeClaimStrength } from "./routing";
import type { SafeguardResult } from "./safeguard";

export type MirrorTone =
	| "poetic"
	| "gentle"
	| "direct"
	| "adaptive"
	| "witnessed";

export interface MirrorPlan {
	claimStrength: ClaimStrength;
	exerciseTitle: ExerciseTitle;
	isCrisis: boolean;
	isEscalation: boolean;
	/** Preliminary — the gave_up rule is folded in later at session completion. */
	requiresFollowUp: boolean;
	riskFlag: boolean;
	tone: MirrorTone;
}

/**
 * Real fence: a witnessed preference set before a downgrade must not keep
 * granting the premium tone after entitlement lapses. Exported separately
 * because the driver needs the tone before classification exists (pattern
 * summaries are built pre-classifier).
 */
export function resolveMirrorTone(
	rawMirrorTone: string | undefined,
	isPremium: boolean
): MirrorTone {
	const raw = rawMirrorTone ?? "adaptive";
	return (raw === "witnessed" && !isPremium ? "adaptive" : raw) as MirrorTone;
}

export function decideMirrorOutcome(input: {
	rawMirrorTone: string | undefined;
	isPremium: boolean;
	classification: ClassificationResult;
	safeguard: SafeguardResult;
	entryType: string;
	/** Highest rag.search score, absent on cold start / nothing retrieved. */
	episodicTopScore?: number;
	/** Another session by this profile already reached today. */
	profileReachedToday: boolean;
	/** Exercise similarity to tonight's text; absent with no vector (#569). */
	exerciseSimilarity?: ExerciseSimilarity;
}): MirrorPlan {
	const { classification, safeguard } = input;

	const rankedTitles = matchExercise(
		{
			confirmationState: "confirmed",
			entryType: input.entryType,
			granularLabel: classification.granularLabel,
			intensity: classification.intensity,
			primaryEmotion: classification.primaryEmotion,
			userLanguageTags: classification.userLanguageTags,
		},
		input.exerciseSimilarity
	);

	return {
		claimStrength: routeClaimStrength({
			atCap: false,
			confidence: classification.primaryEmotionConfidence,
			entryType: input.entryType,
			episodicTopScore: input.episodicTopScore,
			// The initial mirror is always the session's first turn: no reach has
			// gone out yet and the cap is two turns away.
			gapNamedThisSession: false,
			isEscalation: safeguard.isEscalation,
			profileReachedToday: input.profileReachedToday,
			specificity: classification.specificity,
		}),
		// Confidence < 0.6 = ambiguous input → safe fallback to "reset".
		exerciseTitle:
			classification.primaryEmotionConfidence < 0.6 ? "reset" : rankedTitles[0],
		isCrisis: safeguard.isCrisis,
		isEscalation: safeguard.isEscalation,
		requiresFollowUp:
			safeguard.isEscalation || classification.requiresFollowUp === true,
		riskFlag: safeguard.riskFlag,
		tone: resolveMirrorTone(input.rawMirrorTone, input.isPremium),
	};
}
