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

const currentAccount = () => getClerkInstance().user?.id;

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

export function useTrackPlayback(
	slug: string,
	options: {
		stepId?: Id<"path_steps">;
		gain?: number;
		stopAtEnd?: boolean;
		preview?: boolean;
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
	const armedLaps = useRef(p.laps);

	useEffect(() => {
		completed.current = p.didJustFinish;
		armedLaps.current = p.laps;
		// eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm on identity only, never on the finish itself
	}, [slug, options.stepId]);

	useEffect(() => {
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
		if (!(next.logNow && trackId && heardBy) || options.preview) {
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
		options.preview,
	]);

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
		if (next.write && trackId && !options.preview) {
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
		options.preview,
	]);
	const preview = options.preview === true;
	useEffect(
		() => () => {
			const at = flushProgress(progress.current, family);
			if (at && trackId && !preview) {
				sendProgress(recordProgress, trackId, at);
			}
		},
		[family, trackId, recordProgress, preview]
	);

	return p;
}
