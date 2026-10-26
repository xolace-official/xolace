import type { SupportNeed } from "../providers/anthropic";
import { TRY_THIS } from "./tryThis";

/**
 * Kindling action catalog (docs/paths-v1.md §3.1, #331). Action TYPES in
 * code, not a table. The generation model sees `modelDescription` and picks
 * a key; the binder (§2.3, #332) turns a key into concrete content.
 *
 * Audio and music are FAMILIES: one entry per topic, never per track. The
 * `topic` on each entry matches `audio_tracks.topic` — it is the join key the
 * binder uses. "The Spectrum" episodes ride the `audio_topic_*` entries and
 * compete with standalones on tags — `tier` is editorial, never a binding
 * gate; only Track 2 gets its own cross-topic key, `episode_reframe`.
 */
export interface CatalogEntry {
	actionType: string;
	alwaysAvailable: boolean; // breathing = true; content-bound = false
	detail?: string;
	emotions: string[]; // binder tag axis
	humanContact: boolean; // true only for xolacer
	modelDescription: string; // what the generation model sees
	premium: boolean; // always true in v1
	supportNeedFit: Exclude<SupportNeed, "none">[];
	themes: string[]; // binder tag axis
	/** Try-this only (#567): the card's short name, and the curated step as offered. */
	title?: string;
}

const BOTH: Exclude<SupportNeed, "none">[] = ["light", "active"];

/**
 * `audio_topic_<slug>` / `music_topic_<slug>` — the suffix is the axis both
 * families share; Browse tiles and `topic/[slug]` route on it (#339, #353).
 */
export const TOPIC_PREFIX = /^(audio|music)_topic_/;
export const topicSlug = (topic: string) => topic.replace(TOPIC_PREFIX, "");

/** A topic's display title when its `topics` row has none: `sleep_rest` → "Sleep rest". */
export const topicTitle = (slug: string) => {
	const words = slug.replace(/_/g, " ");
	return words.charAt(0).toUpperCase() + words.slice(1);
};

function audioTopic(
	topic: string,
	emotions: string[],
	themes: string[],
	modelDescription: string
): CatalogEntry {
	return {
		actionType: `audio_topic_${topic}`,
		alwaysAvailable: false,
		emotions,
		humanContact: false,
		modelDescription,
		premium: true,
		supportNeedFit: BOTH,
		themes,
	};
}

function musicTopic(
	topic: string,
	emotions: string[],
	themes: string[],
	modelDescription: string
): CatalogEntry {
	return {
		actionType: `music_topic_${topic}`,
		alwaysAvailable: false,
		emotions,
		humanContact: false,
		modelDescription,
		premium: true,
		supportNeedFit: BOTH,
		themes,
	};
}

export const CATALOG: readonly CatalogEntry[] = [
	{
		actionType: "breathing",
		alwaysAvailable: true,
		emotions: [],
		humanContact: false,
		modelDescription:
			"A short guided slow-breathing exercise, about a minute, done right where they are. Fits when the body is wound up or the mind is racing.",
		premium: true,
		supportNeedFit: BOTH,
		themes: [],
	},
	{
		actionType: "xolacer",
		alwaysAvailable: false,
		emotions: [],
		humanContact: true,
		modelDescription:
			"A quiet conversation with a peer listener — another person who has sat with something similar. The only action involving a real human. Fits when they seem to want company, not tools.",
		premium: true,
		supportNeedFit: BOTH,
		themes: [],
	},
	{
		actionType: "bridge",
		alwaysAvailable: true,
		emotions: [],
		humanContact: false,
		modelDescription:
			"Draft a short message to send someone the user already knows outside the app — a partner, friend, or family member — to open up about what they're carrying. Fits when the gap is not inside Xolace but with a real person in their life who doesn't know yet.",
		premium: true,
		supportNeedFit: BOTH,
		themes: [],
	},
	{
		// Binds by facet overlap with the Library (#412), not by these tag axes.
		actionType: "read",
		alwaysAvailable: false,
		emotions: [],
		humanContact: false,
		modelDescription:
			"A short piece to read from the Library — an explainer, practical advice, or someone's own story about something close to what they're carrying. Fits when putting words and context to it would help, and they have a few quiet minutes.",
		premium: true,
		supportNeedFit: BOTH,
		themes: [],
	},
	{
		actionType: "episode_reframe",
		alwaysAvailable: false,
		emotions: ["shame", "guilt", "sadness", "numbness"],
		humanContact: false,
		modelDescription:
			'A short spoken episode from the series "Reality, Not False Hope" — plain talk that pushes back on toxic positivity and self-invalidation. Fits when they are telling themselves they should be over it, that others have it worse, or that their feeling is wrong to have.',
		premium: true,
		supportNeedFit: BOTH,
		themes: ["self-criticism", "toxic-positivity", "should-be-over-this"],
	},
	audioTopic(
		"anxiety_relief",
		["anxiety", "fear"],
		["vigilance", "masking", "anticipation", "support", "grounding"],
		"Spoken support audio for settling an anxious body — naming the vigilance and masking, then grounding through it."
	),
	audioTopic(
		"grief",
		["grief", "sadness"],
		["loss", "death", "missing-someone"],
		"Spoken support audio on loss and missing someone — sitting with grief rather than fixing it."
	),
	audioTopic(
		"sadness",
		["sadness"],
		["low-mood", "heaviness", "disappointment"],
		"Spoken support audio on low, heavy days — company for sadness that has no single cause."
	),
	audioTopic(
		"anger",
		["anger", "disgust"],
		["conflict", "injustice", "resentment"],
		"Spoken support audio on anger and resentment — room to feel it without acting on it."
	),
	audioTopic(
		"shame",
		["shame", "guilt"],
		["self-criticism", "regret", "not-enough"],
		"Spoken support audio on shame, guilt and the harsh inner voice."
	),
	audioTopic(
		"numbness",
		["numbness", "confusion"],
		["disconnection", "emptiness", "going-through-motions"],
		"Spoken support audio on feeling flat, empty or disconnected from yourself."
	),
	audioTopic(
		"loneliness",
		["sadness", "love"],
		["loneliness", "isolation", "relationships"],
		"Spoken support audio on loneliness and feeling unseen, even around people."
	),
	audioTopic(
		"overwhelm",
		["anxiety", "sadness", "confusion"],
		["overwhelm", "burnout", "too-much", "work"],
		"Spoken support audio on being stretched thin — too much on, no room to breathe."
	),
	audioTopic(
		"procrastination",
		["anxiety", "shame", "fear"],
		["avoidance", "self-talk", "momentum", "stuck"],
		"Spoken support audio on avoidance and the shrinking feeling before starting — naming the fear under the delay."
	),
	audioTopic(
		"mild_stress",
		["anxiety"],
		["tension", "buildup", "breathwork", "release"],
		"Spoken support audio on stress that built up quietly — noticing the tension and releasing it through breath."
	),
	audioTopic(
		"decision_fatigue",
		["confusion", "anxiety"],
		["depletion", "overload", "simplification", "willpower"],
		"Spoken support audio on being worn down by too many small choices — simplifying when willpower runs thin."
	),
	audioTopic(
		"depression_non_crisis",
		["sadness", "numbness"],
		["flatness", "anhedonia", "dismissal", "permission"],
		"Spoken support audio on a low mood that won't lift — permission to feel flat without dismissing it."
	),
	audioTopic(
		"mild_burnout",
		["numbness", "sadness"],
		["recognition", "exhaustion", "apathy", "onset"],
		"Spoken support audio on running on empty — naming early burnout before it deepens."
	),
	audioTopic(
		"relationship_strain",
		["sadness", "anger"],
		["drift", "gap", "blamelessness", "repair"],
		"Spoken support audio on a relationship that's drifted — sitting with the gap without assigning blame."
	),
	audioTopic(
		"sleep_hygiene",
		["anxiety", "numbness"],
		["screens", "winddown", "consistency", "arousal"],
		"Spoken support audio on the habits that keep sleep away — winding down instead of fighting for it."
	),
	audioTopic(
		"social_awkwardness",
		["shame", "anxiety"],
		["rumination", "insecurity", "vigilance", "perspective"],
		"Spoken support audio on replaying an awkward moment — perspective on how little the room actually noticed."
	),
	// Music topics mirror the curated Pixabay shelves exactly (20 topics).
	musicTopic(
		"anxiety_relief",
		["anxiety", "fear"],
		["racing-thoughts", "worry", "dread", "unease", "nervousness"],
		"Instrumental music chosen to settle worry and a racing mind."
	),
	musicTopic(
		"stress_relief",
		["anxiety", "anger"],
		["overwhelm", "pressure", "work", "tension", "burnout"],
		"Instrumental music for pressure and being stretched thin."
	),
	musicTopic(
		"sadness",
		["sadness", "grief"],
		["low-mood", "heaviness", "melancholy", "longing", "quiet-sorrow"],
		"Instrumental music that keeps company with a low, heavy mood rather than lifting it."
	),
	musicTopic(
		"loneliness",
		["sadness", "love"],
		["loneliness", "isolation", "longing", "distance", "missing-someone"],
		"Instrumental music for feeling alone or unseen."
	),
	musicTopic(
		"overthinking",
		["anxiety", "confusion"],
		[
			"racing-thoughts",
			"rumination",
			"overanalysis",
			"spiraling",
			"indecision",
		],
		"Instrumental music to sit inside when the mind will not stop looping."
	),
	musicTopic(
		"calm_peace",
		["anxiety", "anger", "fear"],
		["tension", "restlessness", "serenity", "stillness", "ease"],
		"Slow, steady instrumental music — nothing to do but sit inside it for a few minutes."
	),
	musicTopic(
		"meditation",
		["anxiety", "confusion"],
		["stillness", "restlessness", "grounding", "spaciousness", "quiet-mind"],
		"Sparse instrumental music made for sitting still with eyes closed."
	),
	musicTopic(
		"mindfulness",
		["confusion", "numbness"],
		["disconnection", "presence", "awareness", "grounding", "noticing"],
		"Quiet instrumental music for noticing what is here right now."
	),
	musicTopic(
		"deep_relaxation",
		["anxiety", "sadness"],
		["tension", "exhaustion", "release", "softening", "unwinding"],
		"Long, soft instrumental music for letting the body unclench."
	),
	musicTopic(
		"sleep_rest",
		["sadness", "anxiety", "numbness"],
		["exhaustion", "sleep", "drowsiness", "stillness", "winding-down"],
		"Very soft instrumental music for when they are worn out and need to stop."
	),
	musicTopic(
		"healing_recovery",
		["grief", "sadness", "shame"],
		["loss", "recovery", "after-something-hard", "rebuilding", "gentleness"],
		"Gentle instrumental music for the slow part after something hard."
	),
	musicTopic(
		"self_love",
		["shame", "guilt"],
		[
			"self-criticism",
			"not-enough",
			"self-compassion",
			"acceptance",
			"tenderness",
		],
		"Warm instrumental music for when the inner voice has been harsh."
	),
	musicTopic(
		"happiness_joy",
		["joy", "love"],
		["gratitude", "lightness", "playfulness", "delight", "warmth"],
		"Bright instrumental music for a moment that deserves to be enjoyed, not analysed."
	),
	musicTopic(
		"motivation",
		["numbness", "sadness"],
		["stuck", "avoidance", "low-energy", "momentum", "drive"],
		"Instrumental music with forward motion for feeling stuck or flat."
	),
	musicTopic(
		"hope_positivity",
		["sadness", "fear"],
		["uncertainty", "future", "possibility", "renewal", "optimism"],
		"Open, lifting instrumental music for when the future feels closed."
	),
	musicTopic(
		"emotional_release",
		["anger", "grief", "sadness"],
		["tension", "letting-go", "held-in", "catharsis", "surrender"],
		"Instrumental music with weight and movement — for feelings that need somewhere to go."
	),
	musicTopic(
		"focus_concentration",
		["anxiety", "confusion"],
		["work", "distraction", "overwhelm", "clarity", "concentration"],
		"Steady instrumental music for getting back to one thing at a time."
	),
	musicTopic(
		"nature_mindfulness",
		["anxiety", "numbness"],
		["disconnection", "restlessness", "grounding", "openness", "stillness"],
		"Nature-led instrumental soundscapes for stepping out of the noise."
	),
	musicTopic(
		"breathing_meditation",
		["anxiety", "fear"],
		["racing-thoughts", "tension", "steadiness", "grounding", "slowing-down"],
		"Slow instrumental music paced for breathing along with it."
	),
	musicTopic(
		"confidence_empowerment",
		["shame", "fear"],
		["self-doubt", "not-enough", "resolve", "strength", "self-trust"],
		"Grounded, rising instrumental music for when self-doubt is loud."
	),
	...TRY_THIS,
];

export const CATALOG_BY_KEY: ReadonlyMap<string, CatalogEntry> = new Map(
	CATALOG.map((entry) => [entry.actionType, entry])
);

/** Every shared topic suffix the catalogue knows — the only valid `topics.slug` values. */
export const TOPIC_SLUGS: ReadonlySet<string> = new Set(
	CATALOG.filter((e) => TOPIC_PREFIX.test(e.actionType)).map((e) =>
		topicSlug(e.actionType)
	)
);
