import { SIMILARITY_FLOOR } from "../ai/paths/bind";
import { freeEmotionFamily } from "../lib/understandingVocab";

export type MatchInput = {
	primaryEmotion: string;
	granularLabel?: string;
	intensity: number;
	userLanguageTags: string[];
	entryType: string;
	confirmationState: "confirmed" | "refined" | "gave_up" | "abandoned";
	/** The safeguard flagged the session (see `isAtRisk`); absent = not flagged. */
	atRisk?: boolean;
};

export type ExerciseTitle =
	| "let_it_land"
	| "find_your_edges"
	| "make_room"
	| "speak_to_it"
	| "soften_toward_it"
	| "reset"
	| "pause_before_acting"
	| "slow_it_down"
	| "not_only_you"
	| "name_the_room";

/**
 * Written for moderate moments, so never offered when the safeguard flagged
 * the session or at intensity 8 and above: those keep the first six.
 */
const MODERATE_ONLY: ReadonlySet<ExerciseTitle> = new Set([
	"pause_before_acting",
	"slow_it_down",
	"not_only_you",
	"name_the_room",
]);

const HIGH_INTENSITY = 8;
/** Anger at or above this reaches for Pause before you act first. */
const PAUSE_FIRST_INTENSITY = 6;

/** The safeguard's read of a session, as stored or as just decided. */
export function isAtRisk(signal: {
	riskFlag?: boolean;
	safeguardLevel?: string;
	escalated?: boolean;
}): boolean {
	return (
		signal.riskFlag === true ||
		signal.escalated === true ||
		signal.safeguardLevel === "elevated" ||
		signal.safeguardLevel === "crisis"
	);
}

const HIGH_ACTIVATION = new Set([
	"anxiety",
	"panic",
	"dread",
	"overwhelm",
	"terror",
]);
const NUMB = new Set(["numbness", "dissociation", "flatness", "anhedonia"]);
const STUCK = new Set(["helplessness", "despair", "hopelessness"]);
const SHAME = new Set(["shame", "guilt", "embarrassment"]);
const ANGER = new Set(["anger", "frustration", "rage", "resentment"]);
const LONELY = new Set(["loneliness", "not-belonging", "homesickness"]);

const NUMB_TAGS = new Set([
	"numb",
	"empty",
	"foggy",
	"blank",
	"hollow",
	"flat",
	"dissociated",
	"checked out",
	"disconnected",
]);
const STUCK_TAGS = new Set([
	"stuck",
	"trapped",
	"heavy",
	"paralyzed",
	"frozen",
	"can't move",
	"can't start",
]);
const SHAME_TAGS = new Set([
	"shame",
	"worthless",
	"failing",
	"not enough",
	"broken",
	"defective",
]);
const ANGER_TAGS = new Set([
	"angry",
	"furious",
	"rage",
	"resentment",
	"betrayal",
	"violated",
]);
const LONELY_TAGS = new Set([
	"lonely",
	"alone",
	"isolated",
	"left out",
	"invisible",
	"unseen",
]);

/** Best-chunk similarity to tonight's text by exercise title (#569); a title may be missing. */
export type ExerciseSimilarity = Record<string, number>;

function hasTag(tags: string[], set: Set<string>): boolean {
	return tags.some((t) => set.has(t.toLowerCase()));
}

/**
 * Returns ranked exercises (primary + fallbacks). Never returns an empty list.
 * Every step is a rule (ADR 0021); only the catch-all ranks on `similarity`.
 */
export function matchExercise(
	input: MatchInput,
	similarity?: ExerciseSimilarity
): ExerciseTitle[] {
	const ranked = rankExercises(input, similarity);
	return input.atRisk === true || input.intensity >= HIGH_INTENSITY
		? ranked.filter((t) => !MODERATE_ONLY.has(t))
		: ranked;
}

function rankExercises(
	input: MatchInput,
	similarity?: ExerciseSimilarity
): ExerciseTitle[] {
	const {
		primaryEmotion,
		granularLabel,
		intensity,
		userLanguageTags,
		confirmationState,
	} = input;
	// Family, so a finer emotion (stress) steers like its parent (anxiety) — ADR 0018,
	// and a free-text granular label (worried) like the emotion it means (#536).
	const words = [
		...freeEmotionFamily(primaryEmotion),
		...(granularLabel === undefined ? [] : freeEmotionFamily(granularLabel)),
	];
	const matches = (set: Set<string>) => words.some((w) => set.has(w));

	if (confirmationState === "gave_up" || confirmationState === "abandoned") {
		return [
			"reset",
			"let_it_land",
			"find_your_edges",
			"make_room",
			"speak_to_it",
			"soften_toward_it",
			"slow_it_down",
			"name_the_room",
			"not_only_you",
			"pause_before_acting",
		];
	}

	if (intensity >= HIGH_INTENSITY || matches(HIGH_ACTIVATION)) {
		return [
			"reset",
			"slow_it_down",
			"let_it_land",
			"make_room",
			"find_your_edges",
			"speak_to_it",
			"soften_toward_it",
			"name_the_room",
			"not_only_you",
			"pause_before_acting",
		];
	}

	if (matches(NUMB) || hasTag(userLanguageTags, NUMB_TAGS)) {
		return [
			"find_your_edges",
			"name_the_room",
			"let_it_land",
			"reset",
			"make_room",
			"speak_to_it",
			"soften_toward_it",
			"slow_it_down",
			"not_only_you",
			"pause_before_acting",
		];
	}

	if (matches(STUCK) || hasTag(userLanguageTags, STUCK_TAGS)) {
		return [
			"make_room",
			"let_it_land",
			"reset",
			"find_your_edges",
			"speak_to_it",
			"soften_toward_it",
			"slow_it_down",
			"name_the_room",
			"not_only_you",
			"pause_before_acting",
		];
	}

	if (matches(SHAME) || hasTag(userLanguageTags, SHAME_TAGS)) {
		return [
			"soften_toward_it",
			"not_only_you",
			"let_it_land",
			"make_room",
			"reset",
			"find_your_edges",
			"speak_to_it",
			"slow_it_down",
			"name_the_room",
			"pause_before_acting",
		];
	}

	if (matches(ANGER) || hasTag(userLanguageTags, ANGER_TAGS)) {
		const lead: ExerciseTitle[] =
			intensity >= PAUSE_FIRST_INTENSITY
				? ["pause_before_acting", "speak_to_it"]
				: ["speak_to_it", "pause_before_acting"];
		return [
			...lead,
			"make_room",
			"let_it_land",
			"reset",
			"find_your_edges",
			"soften_toward_it",
			"slow_it_down",
			"name_the_room",
			"not_only_you",
		];
	}

	if (matches(LONELY) || hasTag(userLanguageTags, LONELY_TAGS)) {
		return [
			"not_only_you",
			"let_it_land",
			"soften_toward_it",
			"make_room",
			"find_your_edges",
			"reset",
			"speak_to_it",
			"slow_it_down",
			"name_the_room",
			"pause_before_acting",
		];
	}

	const order: ExerciseTitle[] = [
		"let_it_land",
		"make_room",
		"soften_toward_it",
		"find_your_edges",
		"reset",
		"speak_to_it",
		"slow_it_down",
		"not_only_you",
		"name_the_room",
		"pause_before_acting",
	];
	if (!similarity) {
		return order;
	}
	// Above the floor by meaning, closest first; the rest keep today's order.
	// Raw scores, no bands: exercises have no history rules to break ties.
	const close = order
		.filter((t) => (similarity[t] ?? -1) >= SIMILARITY_FLOOR.exercise)
		.sort((a, b) => similarity[b]! - similarity[a]!);
	return [...close, ...order.filter((t) => !close.includes(t))];
}
