import type { Doc } from "../../_generated/dataModel";
import { freeEmotionFamily } from "../../lib/understandingVocab";
import { CATALOG_BY_KEY } from "./catalog";
import { isTryThis } from "./tryThis";

/**
 * Kindling content binder (docs/paths-v1.md §2.3, §8; #332).
 *
 * The model picks an action TYPE; this pure function picks the concrete
 * target. Deterministic on Understanding fields + candidate rows only — no
 * clock, no randomness, no model call — so the same session always binds
 * the same slug and a re-run is a no-op.
 */

export type BindTrack = Pick<
	Doc<"audio_tracks">,
	"slug" | "family" | "topic" | "secondaryTopic" | "tags" | "active" | "series"
> & {
	/** Best-chunk similarity to tonight's text (#572); absent when the topic wasn't searched or didn't reach it. */
	similarity?: number;
};

export interface BindUnderstanding {
	/** Life areas of the compounding domains tonight touched (#521): tie-breakers, never a gate. */
	compoundingTags?: string[];
	primaryEmotion: string;
	/**
	 * `slugKey`s tended during a returning compounding domain's previous stretch
	 * (#566) — the one place repetition is the point. Wins ties over a skip.
	 */
	reofferSlugs?: string[];
	secondaryEmotion?: string;
	/** `slugKey`s whose newest past verdict is a skip (#566): they lose ties, never a better score. */
	skippedSlugs?: string[];
	suggestedSpecialty: Doc<"emotional_metadata">["suggestedSpecialty"];
	thematicTags: string[];
}

/** A Library entry the reader hasn't finished, with the facets that matched this Understanding. */
export interface BindEntry {
	emotions: string[]; // `emotion` facet slugs
	lifeAreas: string[]; // `lifeArea` facet slugs
	/** Best-chunk similarity to tonight's text (#568); absent when the search didn't reach it. */
	similarity?: number;
	slug: string;
}

/**
 * Below this a match in meaning doesn't count and binding falls back to the
 * overlap it replaced (ADR 0021). One floor per twig type, since each
 * content type's text sits differently against a session's.
 * ponytail: provisional; tune from `path_generated.readTopScore`,
 * `path_generated.trackSearch[].topScore`, `mirror_delivered.exerciseTopScore`
 * and `xolacer_suggestion_ranked.topScore`.
 */
export const SIMILARITY_FLOOR = {
	exercise: 0.3,
	read: 0.3,
	track: 0.3,
	xolacer: 0.3,
} as const;

/** Similarity in 0.05 bands, so the history rules still have ties to break (ADR 0021). */
export const similarityBand = (score: number) => Math.floor(score * 20);

export type BoundParams =
	| { slug: string }
	| { exercise: string }
	| { specialty: string };

/** Track 2 "Reality, Not False Hope" — the one cross-topic series (§3.1). */
export const REFRAME_SERIES = "reality-not-false-hope";

/** History is per twig type (#566): a skipped read never demotes a track that shares its slug. */
export const slugKey = (actionType: string, slug: string) =>
	`${actionType}:${slug}`;

/** FNV-1a — deterministic, no randomness/clock, spreads ties across sessions. */
function hashSeed(seed: string): number {
	let h = 2_166_136_261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16_777_619);
	}
	return h >>> 0;
}

export function bindTwig(
	actionType: string,
	u: BindUnderstanding,
	tracks: readonly BindTrack[],
	entries: readonly BindEntry[] = []
): BoundParams | null {
	switch (actionType) {
		case "read":
			return bindEntry(u, entries);
		case "breathing":
			return { exercise: "sit-with-this" };
		case "bridge":
			return { exercise: "trusted-bridge" };
		case "xolacer":
			// The person is chosen at read time by `ai/xolacers/suggest.sessionSuggestion`
			// and never stored — only the ranker's resolved specialty travels.
			return u.suggestedSpecialty ? { specialty: u.suggestedSpecialty } : null;
		default:
			// Try-this (#567): the curated step is the content; only a catalogued one exists.
			if (isTryThis(actionType)) {
				return CATALOG_BY_KEY.has(actionType) ? { exercise: actionType } : null;
			}
			return bindTrack(actionType, u, tracks);
	}
}

function bindTrack(
	actionType: string,
	u: BindUnderstanding,
	tracks: readonly BindTrack[]
): { slug: string } | null {
	const entry = CATALOG_BY_KEY.get(actionType);
	if (!entry) {
		return null;
	}

	// The topic is the gate (ADR 0021): the model's `why` was written for it.
	// A music track listed under it as a secondary topic is in it too, and
	// competes with its own tracks as one.
	// Acuity `tier` is editorial (tone, review process, Browse grouping) — it
	// never gates binding. Standalones and episodes of a topic compete as one.
	const family = actionType.startsWith("music_topic_") ? "music" : "support";
	const candidates = tracks.filter(
		(t) =>
			t.active &&
			t.family === family &&
			(actionType === "episode_reframe"
				? t.series === REFRAME_SERIES
				: t.topic === actionType || t.secondaryTopic === actionType)
	);
	if (candidates.length === 0) {
		return null;
	}

	// Closest in meaning first (#572); with nothing above the floor, tag overlap.
	const close = candidates.filter(
		(t) => (t.similarity ?? -1) >= SIMILARITY_FLOOR.track
	);
	if (close.length > 0) {
		return pickSeeded(
			actionType,
			close,
			(t) => similarityBand(t.similarity!),
			u
		);
	}

	const wanted = new Set([
		...understoodEmotions(u),
		...u.thematicTags,
		...(u.compoundingTags ?? []),
		...entry.emotions,
		...entry.themes,
	]);
	const score = (t: BindTrack) =>
		t.tags.filter((tag) => wanted.has(tag)).length;

	return pickSeeded(actionType, candidates, score, u);
}

/**
 * The read twig: the entry closest in meaning to what the person wrote
 * (#568), banded. With nothing above the floor, a plain facet join (#412,
 * ADR 0015) — the Understanding's emotions against `emotion` facets, its
 * thematic tags against `lifeArea`. Finished and retired entries never reach here.
 */
function bindEntry(
	u: BindUnderstanding,
	entries: readonly BindEntry[]
): { slug: string } | null {
	const close = entries.filter(
		(e) => (e.similarity ?? -1) >= SIMILARITY_FLOOR.read
	);
	if (close.length > 0) {
		return pickSeeded("read", close, (e) => similarityBand(e.similarity!), u);
	}
	const emotions = new Set(understoodEmotions(u));
	const areas = new Set(u.thematicTags);
	const score = (e: BindEntry) =>
		e.emotions.filter((s) => emotions.has(s)).length +
		e.lifeAreas.filter((s) => areas.has(s)).length;
	const candidates = entries.filter((e) => score(e) > 0);
	return candidates.length === 0
		? null
		: pickSeeded("read", candidates, score, u);
}

/**
 * The Understanding's emotions plus their parents, so finer labels still meet
 * older tags (ADR 0018), and a free-text secondary meets the emotion it means (#536).
 */
export function understoodEmotions(
	u: Pick<BindUnderstanding, "primaryEmotion" | "secondaryEmotion">
): string[] {
	return [
		...new Set(
			[
				u.primaryEmotion,
				...(u.secondaryEmotion ? [u.secondaryEmotion] : []),
			].flatMap(freeEmotionFamily)
		),
	];
}

function pickSeeded<T extends { slug: string }>(
	actionType: string,
	candidates: readonly T[],
	score: (c: T) => number,
	u: BindUnderstanding
): { slug: string } {
	// Sort first so the tied set (and its order) is independent of input order,
	// then spread ties deterministically across sessions via a seeded hash.
	const sorted = [...candidates].sort(
		(a, b) =>
			score(b) - score(a) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
	);
	const topScore = score(sorted[0]);
	// Within the top band, in order (#566): the returning stretch's re-offer,
	// then a slug skipped before loses ties. Each step keeps the band if it'd empty it.
	const narrow = (band: T[], keep: (t: T) => boolean) => {
		const kept = band.filter(keep);
		return kept.length > 0 ? kept : band;
	};
	const band = sorted.filter((t) => score(t) === topScore);
	const reoffered = narrow(
		band,
		(t) => u.reofferSlugs?.includes(slugKey(actionType, t.slug)) === true
	);
	const pool = narrow(
		reoffered,
		(t) => !u.skippedSlugs?.includes(slugKey(actionType, t.slug))
	);
	const canonicalTags = [...new Set(u.thematicTags)].sort();
	const seed = [
		u.primaryEmotion,
		u.secondaryEmotion ?? "",
		...canonicalTags,
	].join("|");
	const pick = pool[hashSeed(seed) % pool.length];
	return { slug: pick.slug };
}
