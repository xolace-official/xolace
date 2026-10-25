/**
 * The classifier's closed vocabularies — the Understanding's own words.
 * The classifier prompt and response parser interpolate these, and the
 * Library's `emotion` / `lifeArea` facet axes are exactly these lists
 * (ADR 0015), so a read-twig match is a plain join. Grow a list here and every
 * side grows together; removing a value orphans existing facets (ADR 0018).
 */

/** The original broad emotions. They have no parent. */
const ROOT_EMOTIONS = [
	"anger",
	"sadness",
	"grief",
	"fear",
	"anxiety",
	"joy",
	"love",
	"surprise",
	"disgust",
	"shame",
	"guilt",
	"confusion",
	"numbness",
] as const;

/**
 * Finer emotions, each under the broad one it belongs to. Consumers that have
 * not been taught a value explicitly treat it as its parent, so a forgotten
 * edit is never a silent miss (ADR 0018).
 */
const CHILD_EMOTION_PARENT = {
	calm: "joy",
	demotivation: "numbness",
	disappointment: "sadness",
	embarrassment: "shame",
	exhaustion: "numbness",
	frustration: "anger",
	gratitude: "joy",
	homesickness: "sadness",
	hope: "joy",
	hopelessness: "sadness",
	loneliness: "sadness",
	"not-belonging": "sadness",
	overwhelm: "anxiety",
	pride: "joy",
	regret: "guilt",
	relief: "joy",
	"self-doubt": "shame",
	stress: "anxiety",
	uncertainty: "confusion",
} as const;

export const PRIMARY_EMOTIONS = [
	...ROOT_EMOTIONS,
	...(Object.keys(
		CHILD_EMOTION_PARENT
	) as (keyof typeof CHILD_EMOTION_PARENT)[]),
] as const;

export type PrimaryEmotion = (typeof PRIMARY_EMOTIONS)[number];

/**
 * The emotion plus its parent, most specific first. Safety and matching
 * consumers test membership against this, so a child is never invisible.
 * Also used for unknown words (granular labels), which are returned as-is.
 */
export function emotionFamily(emotion: string): string[] {
	return hasOwn(CHILD_EMOTION_PARENT, emotion)
		? [emotion, (CHILD_EMOTION_PARENT as Record<string, string>)[emotion]]
		: [emotion];
}

/**
 * `emotionFamily` for a free-text emotion word (`secondaryEmotion`): trimmed,
 * lowercased, and an aliased word also gains its canonical family. The word
 * itself always stays, so a consumer matching it raw never loses a hit. Read
 * at read time, so
 * stored rows keep the classifier's own word and replayed history is covered
 * too (#536).
 */
export function freeEmotionFamily(word: string): string[] {
	const w = word.trim().toLowerCase();
	return [...new Set([w, ...emotionFamily(canonicalFacet("emotion", w))])];
}

/** Own-property check, so inherited members ("constructor", …) never count as vocabulary. */
function hasOwn(obj: object, key: string): boolean {
	return Object.hasOwn(obj, key);
}

export const THEMATIC_TAGS = [
	"work",
	"relationships",
	"family",
	"identity",
	"health",
	"finances",
	"purpose",
	"self-worth",
	"loss",
	"change",
	"conflict",
	"isolation",
	"achievement",
	"creativity",
	"trauma",
	"abuse",
	"neglect",
	"studies",
	"friendships",
	"romance",
	"belonging",
	"settling-in",
	"future",
	"burnout",
	"sleep",
	"parenting",
	"caregiving",
	"addiction",
	"body-image",
	"social-media",
	"housing",
	// #571: try-this themes (#560) — following the news, measuring up to others.
	"news",
	"comparison",
] as const;

export type ThematicTag = (typeof THEMATIC_TAGS)[number];

/** The 8 scored domains (CONTEXT.md, #486). Keys, not labels. */
export const DOMAINS = [
	"self",
	"purpose",
	"work",
	"love",
	"family",
	"belonging",
	"health",
	"money",
] as const;

export type Domain = (typeof DOMAINS)[number];

/** The names people see (the insights screen uses the same). */
export const DOMAIN_LABELS: Record<Domain, string> = {
	belonging: "Belonging",
	family: "Family",
	health: "Health & Rest",
	love: "Love & Friendship",
	money: "Money & Home",
	purpose: "Purpose & Future",
	self: "Self",
	work: "Work & Studies",
};

/**
 * Every life area's one home (#486). Typed over the full tag union, so adding a
 * tag to THEMATIC_TAGS is a type error until its home is decided here.
 * Texture says what is happening, not where; sensitive is never scored or
 * shown. Neither gives a reading, and neither stops the session's other tags.
 */
export const LIFE_AREA_HOME: Record<
	ThematicTag,
	Domain | "texture" | "sensitive"
> = {
	abuse: "sensitive",
	achievement: "texture",
	addiction: "sensitive",
	belonging: "belonging",
	"body-image": "self",
	burnout: "work",
	caregiving: "family",
	change: "texture",
	comparison: "self",
	conflict: "texture",
	creativity: "purpose",
	family: "family",
	finances: "money",
	friendships: "love",
	future: "purpose",
	health: "health",
	housing: "money",
	identity: "self",
	isolation: "belonging",
	loss: "texture",
	neglect: "sensitive",
	news: "texture",
	parenting: "family",
	purpose: "purpose",
	relationships: "love",
	romance: "love",
	"self-worth": "self",
	"settling-in": "belonging",
	sleep: "health",
	"social-media": "belonging",
	studies: "work",
	trauma: "sensitive",
	work: "work",
};

/** The life areas whose home is this domain. */
export const lifeAreasOf = (domain: Domain): ThematicTag[] =>
	THEMATIC_TAGS.filter((tag) => LIFE_AREA_HOME[tag] === domain);

/**
 * Tags older classifier versions wrote outside the closed list (#490). Two are
 * plain synonyms of a life area and are remapped; every other off-list tag
 * (trust, mood, overwhelm, …) is ignored.
 */
const LEGACY_LIFE_AREA: Record<string, ThematicTag> = {
	direction: "purpose",
	"self-awareness": "identity",
};

/** The domain a tag scores, or null when it gives no reading. */
export function domainOf(tag: string): Domain | null {
	const area = hasOwn(LIFE_AREA_HOME, tag)
		? (tag as ThematicTag)
		: hasOwn(LEGACY_LIFE_AREA, tag)
			? LEGACY_LIFE_AREA[tag]
			: null;
	if (!area) {
		return null;
	}
	const home = LIFE_AREA_HOME[area];
	return home === "texture" || home === "sensitive" ? null : home;
}

/**
 * Words authors use in the Library sheet that resolve to a canonical value.
 * Used at ingest only — never shown to the classifier. `low` is deliberately
 * absent: it is the Daily Mood scale, not an emotion (ADR 0002).
 */
const ALIASES: Record<"emotion" | "lifeArea", Record<string, string>> = {
	emotion: {
		afraid: "fear",
		angry: "anger",
		anxious: "anxiety",
		apathy: "numbness",
		ashamed: "shame",
		bereavement: "grief",
		betrayal: "anger",
		bitterness: "anger",
		despair: "sadness",
		desperate: "anxiety",
		desperation: "anxiety",
		disconnection: "sadness",
		dread: "fear",
		emptiness: "sadness",
		frightened: "fear",
		grieving: "grief",
		guilty: "guilt",
		heartache: "grief",
		// Free-text secondaries the classifier writes (#536). Words that could go
		// either way next to love or joy (longing, jealousy, irritation) are left
		// out on purpose: an unknown word changes nothing.
		heartbreak: "grief",
		heartbroken: "grief",
		helplessness: "sadness",
		homesick: "homesickness",
		hopeful: "hope",
		hopeless: "hopelessness",
		humiliation: "shame",
		hurt: "sadness",
		inadequacy: "shame",
		insecurity: "anxiety",
		isolation: "sadness",
		lonely: "loneliness",
		nervousness: "anxiety",
		"out-of-place": "not-belonging",
		overwhelmed: "overwhelm",
		pain: "sadness",
		panic: "anxiety",
		rage: "anger",
		rejection: "sadness",
		remorse: "guilt",
		resentment: "anger",
		resignation: "numbness",
		revulsion: "disgust",
		sad: "sadness",
		scared: "fear",
		"self-doubting": "self-doubt",
		sorrow: "sadness",
		stressed: "stress",
		terrified: "fear",
		terror: "fear",
		uncertain: "uncertainty",
		unmotivated: "demotivation",
		worried: "anxiety",
		worry: "anxiety",
		worthlessness: "shame",
	},
	lifeArea: {
		"grief-and-loss": "loss",
		"life-after-uni": "future",
		money: "finances",
		wellbeing: "health",
	},
};

/** The canonical slug for an author's word on an axis; unknown words pass through. */
export function canonicalFacet(axis: string, slug: string): string {
	if (!hasOwn(ALIASES, axis)) {
		return slug;
	}
	const aliases = (ALIASES as Record<string, Record<string, string>>)[axis];
	return hasOwn(aliases, slug) ? aliases[slug] : slug;
}
