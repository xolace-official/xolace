export type Segment = "all" | "music" | "support";

type Track = {
	_id: string;
	family: "support" | "music";
	series?: string;
	seriesTitle?: string;
	episodeNumber?: number;
};

export type TopicRow<T extends Track> =
	| { type: "header"; key: string; title: string }
	| { type: "track"; key: string; track: T };

/** Flattens one topic's tracks into rows: standalone first, then each series header with its
 * episodes. Client-side only (§9.3). */
export function topicRows<T extends Track>(
	tracks: T[],
	segment: Segment
): TopicRow<T>[] {
	const visible =
		segment === "all" ? tracks : tracks.filter((t) => t.family === segment);

	const rows: TopicRow<T>[] = visible
		.filter((t) => !t.series)
		.map((t) => ({ key: t._id, track: t, type: "track" }));

	const bySeries = new Map<string, T[]>();
	for (const t of visible) {
		if (!t.series) {
			continue;
		}
		bySeries.set(t.series, [...(bySeries.get(t.series) ?? []), t]);
	}
	for (const [series, episodes] of bySeries) {
		rows.push({
			key: `series:${series}`,
			title: episodes[0].seriesTitle ?? series,
			type: "header",
		});
		for (const t of episodes.sort(
			(a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
		)) {
			rows.push({ key: t._id, track: t, type: "track" });
		}
	}
	return rows;
}
