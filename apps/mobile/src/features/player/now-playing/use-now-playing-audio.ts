import type { Id } from "@xolace/backend/dataModel";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import {
	consumePlayOnLoad,
	nowPlayingPlayback,
	publishPlayback,
	togglePlayback,
} from "@/lib/now-playing/now-playing-store";
import {
	endOfTrack,
	setSleepTimer,
	sleepGain,
	sleepTimer,
	tickSleep,
	useSleepTimerState,
} from "@/lib/now-playing/sleep-timer";
import { useTrackPlayback } from "./use-track-playback";

const TICK_MS = 1000;

/**
 * The host's runner: plays `slug`, publishes its playback for every reader, starts it when it
 * was asked to play with the load, and runs the sleep timer (§4). A timed choice counts down
 * while it plays, fades the gain over its last 30 s (never the volume slider) and pauses at 0;
 * End of track stops at this play's natural end, even on Repeat. No haptic or sound when it
 * ends: someone may be asleep.
 */
export function useNowPlayingAudio(slug: string, stepId?: Id<"path_steps">) {
	const timer = useSleepTimerState();
	const p = useTrackPlayback(slug, {
		gain: sleepGain(timer),
		stepId,
		stopAtEnd: timer.choice === "end",
	});
	const posthog = usePostHog();
	// Every render: `p` is rebuilt from the latest status each time.
	useEffect(() => publishPlayback(p));
	useEffect(() => () => publishPlayback(null), []);

	// Asked to play with the load: once minted, play (a toggle before it's loaded queues).
	useEffect(() => {
		if (p.track && consumePlayOnLoad(slug)) {
			togglePlayback(p, posthog);
		}
		// On the mint only: `p` is rebuilt every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [p.track, slug]);

	const timed = typeof timer.choice === "number";
	useEffect(() => {
		if (!(timed && p.isPlaying)) {
			return;
		}
		const id = setInterval(() => {
			const { next, pause } = tickSleep(sleepTimer());
			setSleepTimer(next);
			const live = nowPlayingPlayback();
			if (pause && live.isPlaying) {
				live.toggle();
			}
		}, TICK_MS);
		return () => clearInterval(id);
	}, [timed, p.isPlaying]);

	useEffect(() => {
		if (p.didJustFinish) {
			setSleepTimer(endOfTrack(sleepTimer()));
		}
	}, [p.didJustFinish]);
}
