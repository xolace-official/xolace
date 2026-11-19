import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY, type Family, type TopicFilter } from "@/features/explore/copy";

/** A catalogue track, as `getTopic` and `listByFamily` serve it. */
export type ExploreTrack = FunctionReturnType<
	typeof api.browse.topics.getTopic
>[number];
/** A Topics tile, as `getTopics` serves it. */
export type TopicTile = FunctionReturnType<
	typeof api.browse.topics.getTopics
>[number];
/** A topic's cover: `getTopicHeader`, `null` for an unknown or unpublished slug. */
export type TopicHeader = NonNullable<
	FunctionReturnType<typeof api.browse.topics.getTopicHeader>
>;

/**
 * Playing a track from a row: the app's one now-playing track and the Xolace+ gate. The same
 * for every door's screen; Convex, PostHog and the paywall in the app, nothing in a dev state.
 */
export type Listen = {
	/** A free listener: every track opens Xolace+ (production's gate). */
	locked: boolean;
	/** The slug in the mini player, if any. */
	nowPlaying: string | null;
	playing: boolean;
	open: (track: ExploreTrack) => void;
};

const SECONDS = 60;

/** Whole minutes, never 0: a 40 s track reads "1 min". */
export const minutesOf = (sec: number) =>
	Math.max(1, Math.round(sec / SECONDS));

/** Production's `countLine`: "12 spoken · 8 music", "9 spoken", "8 music". */
export function countLine(t: {
	supportCount: number;
	musicCount: number;
}): string {
	const parts: string[] = [];
	if (t.supportCount > 0) {
		parts.push(COPY.spoken(t.supportCount));
	}
	if (t.musicCount > 0) {
		parts.push(COPY.music(t.musicCount));
	}
	return parts.join(" · ");
}

/** Topics, alphabetical by slug (production's order, whatever the query returns). */
export const topicsInOrder = (topics: readonly TopicTile[]) =>
	[...topics].sort((a, b) => a.slug.localeCompare(b.slug));

/**
 * A list's second line: "Wind down · Episode 2 · 9 min" for an episode, else "Sleep · 7 min".
 * Music runs its length too: production doesn't loop it unless the listener turns on Repeat.
 * Without a `topicTitle` (an older backend), the length alone.
 */
export function listMeta(t: ExploreTrack): string {
	const min = minutesOf(t.durationSec);
	if (t.episodeNumber !== undefined && t.seriesTitle) {
		return COPY.episodeMeta(t.seriesTitle, t.episodeNumber, min);
	}
	return t.topicTitle
		? `${t.topicTitle} · ${COPY.minutes(min)}`
		: COPY.minutes(min);
}

/** On a topic the heading already says the topic and the kind: the length alone. */
export const topicMeta = (t: ExploreTrack) =>
	COPY.minutes(minutesOf(t.durationSec));

/** The chips show only when a topic holds both kinds. */
export const hasBothKinds = (h: { supportCount: number; musicCount: number }) =>
	h.supportCount > 0 && h.musicCount > 0;

/** `?family=` preselects a chip, when there are chips to select. */
export function initialFilter(
	param: string | undefined,
	chips: boolean
): TopicFilter {
	return chips && (param === "support" || param === "music") ? param : "all";
}

/** `?family=` on a list: music, else Support audio. */
export const familyOf = (param: string | undefined): Family =>
	param === "music" ? "music" : "support";

export type TopicSection =
	| { key: string; kind: "series"; heading: string; tracks: ExploreTrack[] }
	| { key: string; kind: "rows"; heading: string; tracks: ExploreTrack[] };

const byEpisode = (a: ExploreTrack, b: ExploreTrack) =>
	(a.episodeNumber ?? 0) - (b.episodeNumber ?? 0);

/**
 * A topic's grouped list (handoff §4.3). All: each series, Support audio (singles), Music.
 * Support audio: each series, then the singles. Music: music. Series keep the order they first
 * appear in; episodes run by number.
 */
export function topicSections(
	tracks: readonly ExploreTrack[],
	filter: TopicFilter
): TopicSection[] {
	const out: TopicSection[] = [];
	if (filter !== "music") {
		const series = new Map<string, ExploreTrack[]>();
		const singles: ExploreTrack[] = [];
		for (const t of tracks) {
			if (t.family !== "support") {
				continue;
			}
			if (t.series) {
				series.set(t.series, [...(series.get(t.series) ?? []), t]);
			} else {
				singles.push(t);
			}
		}
		for (const [key, eps] of series) {
			out.push({
				heading: COPY.series(eps[0].seriesTitle ?? key),
				key: `series:${key}`,
				kind: "series",
				tracks: [...eps].sort(byEpisode),
			});
		}
		if (singles.length > 0) {
			out.push({
				heading: COPY.family.support,
				key: "support",
				kind: "rows",
				tracks: singles,
			});
		}
	}
	if (filter !== "support") {
		const music = tracks.filter((t) => t.family === "music");
		if (music.length > 0) {
			out.push({
				heading: COPY.family.music,
				key: "music",
				kind: "rows",
				tracks: music,
			});
		}
	}
	return out;
}

/** A topic row's VoiceOver label: "title, meta, spoken", plus the lock for a free listener. */
export function rowLabel(
	t: ExploreTrack,
	meta: string,
	locked: boolean,
	kind = false
): string {
	const parts = [t.title, meta];
	if (kind) {
		parts.push(COPY.kind[t.family]);
	}
	if (locked) {
		parts.push(COPY.locked);
	}
	return parts.join(", ");
}
