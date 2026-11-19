import type { Id } from "@xolace/backend/dataModel";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import {
	consumePlayOnLoad,
	nowPlayingPlayback,
	publishPlayback,
	togglePlayback,
} from "@/lib/now-playing/now-playing-store";
import {
	clearSlept,
	endOfTrack,
	setSleepTimer,
	sleepGain,
	sleepTimer,
	tickSleep,
	useSleepTimerState,
} from "@/lib/now-playing/sleep-timer";
import { useTrackPlayback } from "./use-track-playback";

const TICK_MS = 1000;
const MS_PER_S = 1000;

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

	// Asked to play with the load: once minted, play (a toggle before it's loaded queues). From a
	// saved place, it waits for the player to load, moves there, then plays.
	const startAt = useRef<number | null>(null);
	useEffect(() => {
		if (!p.track) {
			return;
		}
		const { asked, at } = consumePlayOnLoad(slug);
		if (!asked) {
			return;
		}
		if (at > 0) {
			startAt.current = at;
			return;
		}
		togglePlayback(p, posthog);
		// On the mint only: `p` is rebuilt every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [p.track, slug]);
	useEffect(() => {
		const at = startAt.current;
		if (at === null || !p.isLoaded) {
			return;
		}
		startAt.current = null;
		p.seekTo(at)
			.then(() => togglePlayback(nowPlayingPlayback(), posthog))
			.catch((e) => console.error("[useNowPlayingAudio] resume failed:", e));
		// On the load only, as above.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [p.isLoaded]);

	// Any play forgets "Paused by the sleep timer": the lock screen's and headphones' too.
	useEffect(() => {
		if (p.isPlaying) {
			clearSlept();
		}
	}, [p.isPlaying]);

	const timed = typeof timer.choice === "number";
	useEffect(() => {
		if (!(timed && p.isPlaying)) {
			return;
		}
		// Real play time since the last count: from this play's start, then each fire.
		let last = Date.now();
		const count = () => {
			const now = Date.now();
			const step = tickSleep(sleepTimer(), (now - last) / MS_PER_S);
			last = now;
			return step;
		};
		const id = setInterval(() => {
			const { next, pause } = count();
			setSleepTimer(next);
			const live = nowPlayingPlayback();
			if (pause && live.isPlaying) {
				live.toggle();
			}
		}, TICK_MS);
		return () => {
			clearInterval(id);
			// The part-second played since the last fire counts too (a pause, a new track).
			const { next, pause } = count();
			if (!pause) {
				setSleepTimer(next);
			}
		};
	}, [timed, p.isPlaying]);

	useEffect(() => {
		if (p.didJustFinish) {
			setSleepTimer(endOfTrack(sleepTimer()));
		}
	}, [p.didJustFinish]);
}
