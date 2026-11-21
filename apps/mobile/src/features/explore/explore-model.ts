import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY, type Family, type TopicFilter } from "@/features/explore/copy";
import type { BrowseFrom } from "@/lib/now-playing/now-playing-store";

export type ExploreTrack = FunctionReturnType<
	typeof api.browse.topics.getTopic
>[number];
export type TopicTile = FunctionReturnType<
	typeof api.browse.topics.getTopics
>[number];
export type TopicHeader = NonNullable<
	FunctionReturnType<typeof api.browse.topics.getTopicHeader>
>;

export type Listen = {
	locked: boolean;
	nowPlaying: string | null;
	playing: boolean;
	open: (
		track: Pick<ExploreTrack, "family" | "slug">,
		from?: BrowseFrom
	) => void;
};

const SECONDS = 60;

export const minutesOf = (sec: number) =>
	Math.max(1, Math.round(sec / SECONDS));

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

export const topicsInOrder = (topics: readonly TopicTile[]) =>
	[...topics].sort((a, b) => a.slug.localeCompare(b.slug));

export function listMeta(t: ExploreTrack): string {
	const min = minutesOf(t.durationSec);
	if (t.episodeNumber !== undefined && t.seriesTitle) {
		return COPY.episodeMeta(t.seriesTitle, t.episodeNumber, min);
	}
	return t.topicTitle
		? `${t.topicTitle} · ${COPY.minutes(min)}`
		: COPY.minutes(min);
}

export const topicMeta = (t: ExploreTrack) =>
	COPY.minutes(minutesOf(t.durationSec));

export const hasBothKinds = (h: { supportCount: number; musicCount: number }) =>
	h.supportCount > 0 && h.musicCount > 0;

export function initialFilter(
	param: string | undefined,
	chips: boolean
): TopicFilter {
	return chips && (param === "support" || param === "music") ? param : "all";
}

export const familyOf = (param: string | undefined): Family =>
	param === "music" ? "music" : "support";

export type TopicSection =
	| { key: string; kind: "series"; heading: string; tracks: ExploreTrack[] }
	| { key: string; kind: "rows"; heading: string; tracks: ExploreTrack[] };

const byEpisode = (a: ExploreTrack, b: ExploreTrack) =>
	(a.episodeNumber ?? 0) - (b.episodeNumber ?? 0);

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
