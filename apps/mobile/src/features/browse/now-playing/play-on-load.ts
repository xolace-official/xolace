/**
 * Playing a track from a list, with no player screen to tap play on (a Lantern hub's listen
 * card). Pure, so the now-playing store and the hub route share one tested rule. An additive
 * change to a legacy folder; the player redesign (S10) replaces it.
 */

/** What Play on `slug` does, given what the now-playing track is doing. */
export type PlayStep =
	/** A free listener: the paywall, before anything loads. */
	| "paywall"
	/** It's loaded and paused: resume it, as it is (no reload). */
	| "resume"
	/** It's already playing: nothing to do. */
	| "nothing"
	/** Something else, nothing, or this one still minting: load it, and play it once it's in. */
	| "load"
	/** This one's mint failed: drop it and load it again, then play. */
	| "reload";

export function playStep(n: {
	slug: string;
	locked: boolean;
	/** The slug the now-playing track has loaded, if any. */
	loaded: string | null;
	/** Where that track's mint is: in, still coming, or failed (null, or retries spent). */
	mint: "in" | "pending" | "failed";
	playing: boolean;
}): PlayStep {
	if (n.locked) {
		return "paywall";
	}
	if (n.loaded !== n.slug || n.mint === "pending") {
		return "load";
	}
	if (n.mint === "failed") {
		return "reload";
	}
	return n.playing ? "nothing" : "resume";
}

/** A playback's mint, for `playStep`. */
export const mintOf = (p: {
	track: unknown;
	error: unknown;
}): "in" | "pending" | "failed" => {
	if (p.error || p.track === null) {
		return "failed";
	}
	return p.track === undefined ? "pending" : "in";
};

/**
 * The slug waiting to play once it's loaded, after a `setNowPlaying`. Asked to play: that slug.
 * Otherwise a request for the same slug keeps its wait (the player opening over a card that just
 * started it), and any other slug drops it: an old caller never inherits a stale play.
 */
export function armPlayOnLoad(
	pending: string | null,
	next: string,
	play: boolean
): string | null {
	if (play) {
		return next;
	}
	return pending === next ? pending : null;
}

/** Whether `slug`, now loaded, was asked to play, and what's left waiting. Asks once. */
export function takePlayOnLoad(pending: string | null, slug: string) {
	const asked = pending === slug;
	return { asked, pending: asked ? null : pending };
}
