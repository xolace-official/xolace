import type { Id } from "@xolace/backend/dataModel";
import { useEffect } from "react";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	clearNowPlaying,
	useNowPlaying,
	useNowPlayingAttempt,
} from "@/lib/now-playing/now-playing-store";
import { useNowPlayingAudio } from "./use-now-playing-audio";

/** Owns the now-playing track's audio above every screen (S4), so closing the player leaves it
 * playing, and its sleep timer keeps counting. Renders nothing. */
export function NowPlayingHost() {
	const np = useNowPlaying();
	const attempt = useNowPlayingAttempt();
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
	// Keyed by slug (a new twig on the same track keeps the audio) and by Try again, which
	// mints the track afresh.
	return np ? (
		<Runner
			key={`${np.slug}:${attempt}`}
			preview={np.preview === true}
			slug={np.slug}
			stepId={np.stepId}
		/>
	) : null;
}

function Runner({
	slug,
	stepId,
	preview,
}: {
	slug: string;
	stepId?: Id<"path_steps">;
	preview: boolean;
}) {
	useNowPlayingAudio(slug, stepId, preview);
	return null;
}
