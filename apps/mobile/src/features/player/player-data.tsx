import { createContext, type ReactNode, use, useMemo } from "react";
import type { SleepChoice } from "@/lib/now-playing/sleep-timer";
import type { PlayerStatus, PlayerTrack } from "./player-model";
import { usePlayerData } from "./use-player";

/**
 * Everything the player reads and does. Two adapters fill it: the now-playing audio in the app
 * (`PlayerData`) and fixtures in its dev states (`dev/`). The clock sits in its own context
 * (`PlayerClock`), so a status tick re-renders only the few parts that print the time.
 */
export type Player = {
	state: {
		status: PlayerStatus;
		track: PlayerTrack | null;
		playing: boolean;
		/** Repeat one: off for every new track, as production. */
		repeat: boolean;
		/** The app's own level, 0–1 (never the phone's). */
		volume: number;
		sleep: {
			choice: SleepChoice;
			/** "28 min", "0:45", "End of track"; "" when off. Changes once a minute. */
			pill: string;
			/** The last 30 s: the pill dims while the sound fades. */
			fading: boolean;
			/** "Sleep timer, 28 minutes left". */
			voice: string;
		};
		/** The timer paused it: "Paused by the sleep timer" until the next play. */
		slept: boolean;
	};
	actions: {
		toggle: () => void;
		/** Seconds; clamped. */
		seek: (seconds: number) => void;
		/** ±15 s from where the clock is. */
		skip: (by: number) => void;
		setRepeat: (on: boolean) => void;
		setVolume: (volume: number) => void;
		setSleep: (choice: SleepChoice) => void;
		/** Couldn't reach: load it again. */
		retry: () => void;
		close: () => void;
		openCrisisHelp: () => void;
	};
};

/** Where the playhead is, in seconds; changes on every status tick. */
export type PlayerClock = { position: number; duration: number };

const PlayerContext = createContext<Player | null>(null);
const ClockContext = createContext<PlayerClock>({ duration: 0, position: 0 });

export function PlayerProvider({
	value,
	clock,
	children,
}: {
	value: Player;
	clock: PlayerClock;
	children: ReactNode;
}) {
	return (
		<PlayerContext value={value}>
			<ClockContext value={clock}>{children}</ClockContext>
		</PlayerContext>
	);
}

export function usePlayer(): Player {
	const player = use(PlayerContext);
	if (!player) {
		throw new Error("usePlayer needs a PlayerProvider above it");
	}
	return player;
}

/** The clock: only the parts that print or sync the time read it. */
export const usePlayerClock = (): PlayerClock => use(ClockContext);

/** The app's adapter: the player on the now-playing track. */
export function PlayerData({ children }: { children: ReactNode }) {
	const { player, clock } = usePlayerData();
	// A context value (code-style.md's exception): the status ticks every half second, and only
	// the clock should reach the parts then.
	const { position, duration } = clock;
	const clockValue = useMemo(
		() => ({ duration, position }),
		[duration, position]
	);
	return (
		<PlayerProvider clock={clockValue} value={player}>
			{children}
		</PlayerProvider>
	);
}
