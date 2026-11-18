/** The player on fixtures: the real screen under its provider, filled from the board's tracks.
 * A state plays on a simulated clock (one second a second, no audio), so the cover, the scrub,
 * the skips and the timer all move as they do in the app; nothing reaches the backend. A slow
 * seek (`seekLatencyMs`) reports like a streamed one: the clock keeps ticking from the old place
 * until the seek lands, so the playhead's guard can be seen at work without the network. */
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
	type Seek,
	settledPosition,
	skipTarget,
	sleepFading,
	sleepPill,
	sleepVoice,
	toPlayerTrack,
} from "../player-model";
import { PlayerScreen } from "../player-screen";

const TICK_MS = 1000;
/** A slow-seek state reports four times a second, as a streamed status does (twice or more). */
const SLOW_TICK_MS = 250;
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
	/** A seek reaches the clock only this long after it's asked for (a streamed seek). */
	seekLatencyMs?: number;
	/** Without the playhead's guard: the stale ticks pull it back (the bug, for comparison). */
	unguarded?: boolean;
};

function FixturePlayer({
	track,
	status = "ready",
	at = 0,
	paused = false,
	repeat: repeatAt = false,
	sleep: sleepAt = SLEEP_OFF,
	still = false,
	seekLatencyMs = 0,
	unguarded = false,
}: FixtureProps) {
	const [position, setPosition] = useState(at);
	const [playing, setPlaying] = useState(!paused && status === "ready");
	const [repeat, setRepeat] = useState(repeatAt);
	const [volume, setVolume] = useState(VOLUME);
	const [sleep, setSleep] = useState(sleepAt);
	const duration = track?.durationSec ?? 0;
	const lastSeek = useRef<Seek | null>(null);
	const landing = useRef<ReturnType<typeof setTimeout> | null>(null);
	const tickMs = seekLatencyMs > 0 ? SLOW_TICK_MS : TICK_MS;
	useEffect(
		() => () => {
			if (landing.current) {
				clearTimeout(landing.current);
			}
		},
		[]
	);

	useEffect(() => {
		if (!playing || still) {
			return;
		}
		const step = tickMs / MS_PER_S;
		const id = setInterval(() => {
			setPosition((p) =>
				p + step >= duration ? (repeat ? 0 : duration) : p + step
			);
			setSleep((t) => {
				const { next, pause } = tickSleep(t, step);
				if (pause) {
					setPlaying(false);
				}
				return next;
			});
		}, tickMs);
		return () => clearInterval(id);
	}, [playing, still, duration, repeat, tickMs]);

	const seek = (s: number) => {
		const to = Math.max(0, Math.min(duration, Math.round(s)));
		lastSeek.current = { at: Date.now(), to };
		setSleep((t) => ({ ...t, slept: false }));
		if (seekLatencyMs <= 0) {
			setPosition(to);
			return;
		}
		if (landing.current) {
			clearTimeout(landing.current);
		}
		landing.current = setTimeout(() => setPosition(to), seekLatencyMs);
	};
	const value: Player = {
		actions: {
			close: () => router.back(),
			// The crisis-line state proves the whole line opens help (a real route, no backend).
			openCrisisHelp: () => router.push("/crisis-resources"),
			retry: () => undefined,
			seek,
			setRepeat,
			setSleep: (c) => setSleep(pickSleep(c)),
			// The app's guard (`use-player.ts`), so a slow-seek state exercises it.
			settled: (at) =>
				unguarded ? at : settledPosition(at, lastSeek.current, Date.now()),
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
