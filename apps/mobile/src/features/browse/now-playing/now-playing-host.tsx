import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useEffect } from "react";
import {
	clearNowPlaying,
	publishPlayback,
	useNowPlaying,
} from "@/features/browse/now-playing/now-playing-store";
import { useTrackPlayback } from "@/features/browse/use-track-playback";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";

/** Owns the Browse track's audio above every screen (S4), so closing the player leaves it
 * playing. Renders nothing. */
export function NowPlayingHost() {
	const np = useNowPlaying();
	const { isPlus, isResolved } = usePlusEntitlement();
	// Leaving the protected tree (sign-out) drops the track with it.
	useEffect(() => clearNowPlaying, []);
	// A lapsed entitlement drops the track here too: the mini-player resumes without
	// the player screen. `isResolved`, so a still-loading `false` never cuts off a payer.
	const lapsed = isResolved && !isPlus;
	useEffect(() => {
		if (lapsed) {
			clearNowPlaying();
		}
	}, [lapsed, np]);
	// Keyed by slug: a new twig on the same track keeps the audio.
	return np ? <Runner key={np.slug} slug={np.slug} stepId={np.stepId} /> : null;
}

function Runner({ slug, stepId }: { slug: string; stepId?: Id<"path_steps"> }) {
	const p = useTrackPlayback(slug, { stepId });
	// Every render: `p` is rebuilt from the latest status each time.
	useEffect(() => publishPlayback(p));
	useEffect(() => () => publishPlayback(null), []);
	return null;
}
