import {
	createSerializer,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";

import { ENTRY_STATUSES } from "@/features/library/entry-filters";

import { type AudioTrack, TRACK_FAMILIES, topicSlug } from "./types";

export const TRACK_STATUSES = ENTRY_STATUSES;
export const PAGE_SIZE = 25;

// `/audio?family=music&topic=sleep_rest&page=2`: a filtered page is a link.
const trackFilterParsers = {
	family: parseAsStringLiteral(TRACK_FAMILIES),
	page: parseAsInteger.withDefault(1),
	q: parseAsString.withDefault(""),
	status: parseAsStringLiteral(TRACK_STATUSES),
	/** The shared topic suffix, so `sleep_rest` covers music and support. */
	topic: parseAsString,
};

export function useTrackFilters() {
	return useQueryStates(trackFilterParsers, { clearOnDefault: true });
}

export type TrackFilters = ReturnType<typeof useTrackFilters>[0];

/** `?…&page=n` for a pagination link's href. */
export const serializeTrackFilters = createSerializer(trackFilterParsers, {
	clearOnDefault: true,
});

export function filterTracks(
	tracks: readonly AudioTrack[],
	{ family, q, status, topic }: TrackFilters
) {
	const needle = q.trim().toLowerCase();
	return tracks.filter(
		(track) =>
			(!family || track.family === family) &&
			(!status || track.status === status) &&
			(!topic || topicSlug(track.topic) === topic) &&
			(!needle ||
				`${track.title} ${track.slug} ${track.tags.join(" ")} ${track.licence?.artist ?? ""}`
					.toLowerCase()
					.includes(needle))
	);
}
