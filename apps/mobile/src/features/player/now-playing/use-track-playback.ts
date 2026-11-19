import { getClerkInstance } from "@clerk/expo";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useConvex, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { type PlaybackReturn, usePlayback } from "@/lib/audio/use-playback";
import type { BoundTrack } from "@/lib/now-playing/now-playing-store";
import { sendListen, startListen, tickListen } from "./listen-tracker";
import { getLockScreenMetadata } from "./lock-screen-metadata";
import {
	flushProgress,
	type ProgressWrite,
	startProgress,
	tickProgress,
} from "./progress-tracker";

/** Who's signed in now, read when a retry fires, which can be after this player unmounts. */
const currentAccount = () => getClerkInstance().user?.id;

/** Fire and forget: a lost write only moves Continue's place back a little. */
function sendProgress(
	record: (
		args: { trackId: Id<"audio_tracks"> } & ProgressWrite
	) => Promise<null>,
	trackId: Id<"audio_tracks">,
	at: ProgressWrite
) {
	record({ trackId, ...at }).catch((e) => {
		console.error("[useTrackPlayback] progress failed:", e);
	});
}

/** Bound-track player (docs/paths-v1.md §3.3, #334). With a `stepId`, a natural finish tends
 * the twig once; abandoning never does. Browse passes none (§9.6). Every play logs one listen
 * once it's heard for 60 s, or at the end of a shorter track (#697). */
export function useTrackPlayback(
	slug: string,
	options: {
		stepId?: Id<"path_steps">;
		/** The sleep timer's fade, 0–1, on top of the volume. */
		gain?: number;
		/** The sleep timer's End of track: stop at this play's end, even on Repeat. */
		stopAtEnd?: boolean;
	} = {}
): PlaybackReturn<BoundTrack> {
	const convex = useConvex();
	const completeStep = useMutation(api.paths.completeStep);
	const recordListen = useMutation(api.audio.listens.recordListen);
	const recordProgress = useMutation(api.audio.progress.record);
	const p = usePlayback(
		slug,
		() => convex.query(api.paths.getBoundAudioTrack, { slug }),
		getLockScreenMetadata,
		{ gain: options.gain, stopAtEnd: options.stopAtEnd }
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

	// The host remounts this per slug, so one tracker covers the loaded track.
	const listen = useRef(startListen());
	useEffect(() => {
		const next = tickListen(listen.current, {
			currentTime: p.currentTime,
			didJustFinish: p.didJustFinish,
			durationSec: p.duration,
			laps: p.laps,
			now: Date.now(),
			playing: p.isPlaying,
		});
		listen.current = next.tracker;
		const trackId = p.track?.trackId;
		const heardBy = currentAccount();
		if (!(next.logNow && trackId && heardBy)) {
			return;
		}
		sendListen(
			() => recordListen({ trackId }),
			() => currentAccount() === heardBy
		);
	}, [
		p.currentTime,
		p.isPlaying,
		p.didJustFinish,
		p.laps,
		p.duration,
		p.track?.trackId,
		recordListen,
	]);

	// Where a support track was left, for Explore's Pick up where you left off (B6).
	const progress = useRef(startProgress());
	const family = p.track?.family;
	const trackId = p.track?.trackId;
	useEffect(() => {
		if (!family) {
			return;
		}
		const next = tickProgress(progress.current, {
			currentTime: p.currentTime,
			didJustFinish: p.didJustFinish,
			durationSec: p.duration,
			family,
			now: Date.now(),
			playing: p.isPlaying,
		});
		progress.current = next.tracker;
		if (next.write && trackId) {
			sendProgress(recordProgress, trackId, next.write);
		}
	}, [
		p.currentTime,
		p.isPlaying,
		p.didJustFinish,
		p.duration,
		family,
		trackId,
		recordProgress,
	]);
	// The host unmounts this when the track changes or the player clears: a play still going
	// writes where it got to.
	useEffect(
		() => () => {
			const at = flushProgress(progress.current, family);
			if (at && trackId) {
				sendProgress(recordProgress, trackId, at);
			}
		},
		[family, trackId, recordProgress]
	);

	return p;
}
