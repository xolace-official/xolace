import type { TimelineEntry, TimelineFlatItem } from '@/src/features/timeline/types';

/** Shape returned by `sessions.listForTimeline` per enriched session. */
type TimelineSession = {
  _id: string;
  mirrorText: string;
  entryType: string;
  hasMirrorAudio: boolean;
  primaryEmotion: string | null;
  granularLabel: string | null;
  pathChosen: string | null;
  toneUsed: string | null;
  confirmationState: string | null;
  createdAt: number;
};

/** Maps a `listForTimeline` result row to the client-side `TimelineEntry` shape. */
export function toTimelineEntry(session: TimelineSession): TimelineEntry {
  return {
    id: session._id,
    mirrorText: session.mirrorText,
    entryType: session.entryType,
    hasMirrorAudio: session.hasMirrorAudio,
    primaryEmotion: session.primaryEmotion,
    granularLabel: session.granularLabel,
    pathChosen: session.pathChosen,
    toneUsed: session.toneUsed,
    confirmationState: session.confirmationState,
    createdAt: session.createdAt,
  };
}

/**
 * Produce a human-friendly relative day label for a timestamp.
 *
 * @param timestamp - Millisecond UNIX timestamp (milliseconds since 1970-01-01 UTC)
 * @returns `Today` if the timestamp is the current day, `Yesterday` if it was one day ago, `X days ago` for 2–6 days ago, or a short month/day string (for example, `Jan 3`) for dates 7 or more days ago
 */
function getRelativeLabel(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dateUtc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.floor((nowUtc - dateUtc) / 86400000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Group a pre-sorted timeline into flat items where each relative-date section precedes its entries.
 *
 * @param entries - A pre-sorted (newest-first) array of TimelineEntry objects to group by their relative date.
 * @returns An array of TimelineFlatItem containing section items (type `'section'`) followed by the corresponding entry items (type `'entry'`) for each relative date.
 */
export function buildTimelineSections(
  entries: TimelineEntry[],
): TimelineFlatItem[] {
  const result: TimelineFlatItem[] = [];
  let lastLabel = '';

  for (const entry of entries) {
    const label = getRelativeLabel(entry.createdAt);

    if (label !== lastLabel) {
      result.push({ type: 'section', id: `section-${label}`, label });
      lastLabel = label;
    }

    result.push({ type: 'entry', id: entry.id, entry });
  }

  return result;
}
