import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef } from "react";
import { getLockScreenMetadata } from "@/features/browse/track-lock-screen-metadata";
import { type PlaybackReturn, usePlayback } from "@/lib/audio/use-playback";

export type BoundTrack = NonNullable<
	FunctionReturnType<typeof api.paths.getBoundAudioTrack>
>;

/** Bound-track player (docs/paths-v1.md §3.3, #334). With a `stepId`, a natural finish tends
 * the twig once; abandoning never does. Browse passes none (§9.6). */
export function useTrackPlayback(
	slug: string,
	options: { stepId?: Id<"path_steps"> } = {}
): PlaybackReturn<BoundTrack> {
	const convex = useConvex();
	const completeStep = useMutation(api.paths.completeStep);
	const p = usePlayback(
		slug,
		() => convex.query(api.paths.getBoundAudioTrack, { slug }),
		getLockScreenMetadata
	);
	const completed = useRef(false);
	// Laps already played when this twig armed; only a later one finishes it.
	const armedLaps = useRef(p.laps);

	// A new twig re-arms the latch even on the same slug. `didJustFinish` stays
	// true while the player sits finished, so a finish already on screen belongs
	// to the previous twig.
	useEffect(() => {
		completed.current = p.didJustFinish;
		armedLaps.current = p.laps;
		// eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm on identity only, never on the finish itself
	}, [slug, options.stepId]);

	useEffect(() => {
		// Looping never reports `didJustFinish`; a completed lap is the natural finish then.
		const finished = p.didJustFinish || p.laps > armedLaps.current;
		if (!finished || completed.current || !options.stepId) {
			return;
		}
		completed.current = true;
		completeStep({ stepId: options.stepId }).catch((e) => {
			completed.current = false;
			console.error("[useTrackPlayback] completeStep failed:", e);
		});
	}, [p.didJustFinish, p.laps, options.stepId, completeStep]);

	return p;
}
