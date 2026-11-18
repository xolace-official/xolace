/** The player on fixtures: the real screen under its provider, filled from the board's tracks.
 * A state plays on a simulated clock (one second a second, no audio), so the cover, the scrub,
 * the skips and the timer all move as they do in the app; nothing reaches the backend. */
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
	pickSleep,
	SLEEP_OFF,
	type SleepTimer,
	tickSleep,
} from "@/lib/now-playing/sleep-timer";
import { type Player, PlayerProvider } from "../player-data";
import {
	type BoundTrackFields,
	type PlayerStatus,
	skipTarget,
	sleepFading,
	sleepPill,
	sleepVoice,
	toPlayerTrack,
} from "../player-model";
import { PlayerScreen } from "../player-screen";

const TICK_MS = 1000;
const MS_PER_S = 1000;
const VOLUME = 0.78;

export type FixtureProps = {
	track?: BoundTrackFields;
	status?: PlayerStatus;
	at?: number;
	paused?: boolean;
	repeat?: boolean;
	sleep?: SleepTimer;
	/** Hold the clock still, so a capture shows the board's time. */
	still?: boolean;
};

function FixturePlayer({
	track,
	status = "ready",
	at = 0,
	paused = false,
	repeat: repeatAt = false,
	sleep: sleepAt = SLEEP_OFF,
	still = false,
}: FixtureProps) {
	const [position, setPosition] = useState(at);
	const [playing, setPlaying] = useState(!paused && status === "ready");
	const [repeat, setRepeat] = useState(repeatAt);
	const [volume, setVolume] = useState(VOLUME);
	const [sleep, setSleep] = useState(sleepAt);
	const duration = track?.durationSec ?? 0;

	useEffect(() => {
		if (!playing || still) {
			return;
		}
		const id = setInterval(() => {
			setPosition((p) => (p + 1 >= duration ? (repeat ? 0 : duration) : p + 1));
			setSleep((t) => {
				const { next, pause } = tickSleep(t, TICK_MS / MS_PER_S);
				if (pause) {
					setPlaying(false);
				}
				return next;
			});
		}, TICK_MS);
		return () => clearInterval(id);
	}, [playing, still, duration, repeat]);

	const seek = (s: number) => {
		setPosition(Math.max(0, Math.min(duration, Math.round(s))));
		setSleep((t) => ({ ...t, slept: false }));
	};
	const value: Player = {
		actions: {
			close: () => router.back(),
			openCrisisHelp: () => undefined,
			retry: () => undefined,
			seek,
			setRepeat,
			setSleep: (c) => setSleep(pickSleep(c)),
			settled: (at) => at,
			setVolume,
			skip: (by) => {
				setPosition((at) => skipTarget(at, by, duration));
			},
			toggle: () => {
				setPlaying((p) => !p);
				setSleep((t) => ({ ...t, slept: false }));
			},
		},
		state: {
			playing,
			repeat,
			sleep: {
				choice: sleep.choice,
				fading: sleepFading(sleep),
				pill: sleepPill(sleep),
				voice: sleepVoice(sleep),
			},
			slept: sleep.slept,
			status,
			track: track && status === "ready" ? toPlayerTrack(track) : null,
			volume,
		},
	};
	return (
		<PlayerProvider clock={{ duration, position }} value={value}>
			<PlayerScreen />
		</PlayerProvider>
	);
}

/** A dev state's screen and header (the player draws its own chrome). */
export const fixture = (props: FixtureProps) => ({
	options: { headerShown: false },
	Screen: () => <FixturePlayer {...props} />,
});
