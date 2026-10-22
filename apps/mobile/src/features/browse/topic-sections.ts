export type Segment = 'all' | 'music' | 'support';

type Track = {
  _id: string;
  family: 'support' | 'music';
  series?: string;
  seriesTitle?: string;
  episodeNumber?: number;
};

export type TopicRow<T extends Track> = { type: 'header'; key: string; title: string } | { type: 'track'; key: string; track: T };

/**
 * Flatten one topic's tracks into list rows for a segment: standalone tracks
 * first, then each series as a header followed by its episodes in episode
 * order. Client-side only — there is no series landing screen in v1 (§9.3).
 */
export function topicRows<T extends Track>(tracks: T[], segment: Segment): TopicRow<T>[] {
  const visible = segment === 'all' ? tracks : tracks.filter((t) => t.family === segment);

  const rows: TopicRow<T>[] = visible
    .filter((t) => !t.series)
    .map((t) => ({ type: 'track', key: t._id, track: t }));

  const bySeries = new Map<string, T[]>();
  for (const t of visible) {
    if (!t.series) continue;
    bySeries.set(t.series, [...(bySeries.get(t.series) ?? []), t]);
  }
  for (const [series, episodes] of bySeries) {
    rows.push({ type: 'header', key: `series:${series}`, title: episodes[0].seriesTitle ?? series });
    for (const t of episodes.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0))) {
      rows.push({ type: 'track', key: t._id, track: t });
    }
  }
  return rows;
}
