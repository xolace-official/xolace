// Kept local (not imported from track-row.tsx) so this stays a pure, RN-free
// module — the same testable shape as src/lib/format-time.ts.
const FAMILY_LABEL = { music: "Music", support: "Support audio" } as const;

type TrackLike = {
	title: string;
	family: "support" | "music";
	narrators?: string[];
	thumbUrl?: string;
};

/** Maps a bound track to the lock-screen media card fields (#367). */
export function getLockScreenMetadata(track: TrackLike) {
	return {
		artist: track.narrators?.length
			? track.narrators.join(", ")
			: FAMILY_LABEL[track.family],
		artworkUrl: track.thumbUrl,
		title: track.title,
	};
}
