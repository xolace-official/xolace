export const PROGRESS_EVERY_MS = 15_000;

export type ProgressTracker = {
	lastAt?: number;
	wasPlaying: boolean;
	finished: boolean;
	positionSec: number;
};

export type ProgressTick = {
	currentTime: number;
	durationSec: number;
	playing: boolean;
	didJustFinish: boolean;
	family: "support" | "music";
	now: number;
};

export type ProgressWrite = { positionSec: number; finished?: true };

export const startProgress = (): ProgressTracker => ({
	finished: false,
	positionSec: 0,
	wasPlaying: false,
});

export function tickProgress(
	tracker: ProgressTracker,
	tick: ProgressTick
): { tracker: ProgressTracker; write: ProgressWrite | null } {
	const seen = {
		finished: tick.didJustFinish,
		positionSec: tick.currentTime,
		wasPlaying: tick.playing,
	};
	if (tick.family !== "support") {
		return { tracker: { ...seen, lastAt: undefined }, write: null };
	}
	if (tick.didJustFinish && !tracker.finished) {
		return {
			tracker: { ...seen, lastAt: undefined },
			write: {
				finished: true,
				positionSec: Math.max(tick.durationSec, tick.currentTime),
			},
		};
	}
	if (tracker.wasPlaying && !tick.playing && !tick.didJustFinish) {
		return {
			tracker: { ...seen, lastAt: undefined },
			write: { positionSec: tick.currentTime },
		};
	}
	if (!tick.playing) {
		return { tracker: { ...seen, lastAt: tracker.lastAt }, write: null };
	}
	if (tracker.lastAt === undefined || !tracker.wasPlaying) {
		return { tracker: { ...seen, lastAt: tick.now }, write: null };
	}
	if (tick.now - tracker.lastAt >= PROGRESS_EVERY_MS) {
		return {
			tracker: { ...seen, lastAt: tick.now },
			write: { positionSec: tick.currentTime },
		};
	}
	return { tracker: { ...seen, lastAt: tracker.lastAt }, write: null };
}

export function flushProgress(
	tracker: ProgressTracker,
	family: "support" | "music" | undefined
): ProgressWrite | null {
	return family === "support" && tracker.wasPlaying
		? { positionSec: tracker.positionSec }
		: null;
}
