import { createContext, type ReactNode, use, useMemo } from "react";
import type { SleepChoice } from "@/lib/now-playing/sleep-timer";
import type { PlayerStatus, PlayerTrack } from "./player-model";
import { usePlayerData } from "./use-player";

export type Player = {
	state: {
		status: PlayerStatus;
		track: PlayerTrack | null;
		playing: boolean;
		repeat: boolean;
		volume: number;
		sleep: {
			choice: SleepChoice;
			pill: string;
			fading: boolean;
			voice: string;
		};
		slept: boolean;
	};
	actions: {
		toggle: () => void;
		seek: (seconds: number) => void;
		skip: (by: number) => void;
		setRepeat: (on: boolean) => void;
		setVolume: (volume: number) => void;
		setSleep: (choice: SleepChoice) => void;
		retry: () => void;
		close: () => void;
		openCrisisHelp: () => void;
		settled: (position: number) => number;
	};
};

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

export const usePlayerClock = (): PlayerClock => use(ClockContext);

export function PlayerData({ children }: { children: ReactNode }) {
	const { player, clock } = usePlayerData();
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
