// Kept local (not imported from track-row.tsx) so this stays a pure, RN-free
// module — the same testable shape as format-time.ts.
const FAMILY_LABEL = { support: 'Support audio', music: 'Music' } as const;

type TrackLike = {
  title: string;
  family: 'support' | 'music';
  narrators?: string[];
  thumbUrl?: string;
};

/** Maps a bound track to the lock-screen media card fields (#367). */
export function getLockScreenMetadata(track: TrackLike) {
  return {
    title: track.title,
    artist: track.narrators?.length ? track.narrators.join(', ') : FAMILY_LABEL[track.family],
    artworkUrl: track.thumbUrl,
  };
}
