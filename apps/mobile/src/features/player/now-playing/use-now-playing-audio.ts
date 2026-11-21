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

export function useNowPlayingAudio(
	slug: string,
	stepId?: Id<"path_steps">,
	preview = false
) {
	const timer = useSleepTimerState();
	const p = useTrackPlayback(slug, {
		gain: sleepGain(timer),
		preview,
		stepId,
		stopAtEnd: timer.choice === "end",
	});
	const posthog = usePostHog();
	useEffect(() => publishPlayback(p));
	useEffect(() => () => publishPlayback(null), []);

	const startAt = useRef<{ at: number; play: boolean } | null>(null);
	useEffect(() => {
		if (!p.track) {
			return;
		}
		const { asked, at } = consumePlayOnLoad(slug);
		if (at > 0) {
			startAt.current = { at, play: asked };
			return;
		}
		if (!asked) {
			return;
		}
		togglePlayback(p, posthog);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [p.track, slug]);
	useEffect(() => {
		const start = startAt.current;
		if (start === null || !p.isLoaded) {
			return;
		}
		startAt.current = null;
		p.seekTo(start.at)
			.then(() => {
				if (start.play) {
					togglePlayback(nowPlayingPlayback(), posthog);
				}
			})
			.catch((e) => console.error("[useNowPlayingAudio] resume failed:", e));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [p.isLoaded]);

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
