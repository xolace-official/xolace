/**
 * Playing a track from a list, with no player screen to tap play on (a Lantern hub's listen
 * card). Pure, so the now-playing store and the hub route share one tested rule. An additive
 * change to a legacy folder; the player redesign (S10) replaces it.
 */

/** What Play on `slug` does, given what the now-playing track is doing. */
export type PlayStep =
	/** A free listener: the paywall, before anything loads. */
	| "paywall"
	/** It's already loaded and paused: resume it, as it is (no reload). */
	| "resume"
	/** It's already playing: nothing to do. */
	| "nothing"
	/** Something else or nothing is loaded: load this one and play it once it's in. */
	| "load";

export function playStep(n: {
	slug: string;
	locked: boolean;
	/** The slug the now-playing track has loaded, if any. */
	loaded: string | null;
	playing: boolean;
}): PlayStep {
	if (n.locked) {
		return "paywall";
	}
	if (n.loaded !== n.slug) {
		return "load";
	}
	return n.playing ? "nothing" : "resume";
}

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
