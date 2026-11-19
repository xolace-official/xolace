/**
 * Where a support track was left, for Explore's Pick up where you left off
 * (`audio.progress.record`, B6). Written every so often while it plays, when it pauses, and once
 * at its natural end. Music is never written: it loops, so a place in it means nothing.
 */

/** How often a playing track writes its place. */
export const PROGRESS_EVERY_MS = 15_000;

export type ProgressTracker = {
	/** Wall clock at the last write, or when this play began (a play doesn't write at once). */
	lastAt?: number;
	wasPlaying: boolean;
	/** `didJustFinish` as last seen, so one finish writes once. */
	finished: boolean;
	/** The place last seen, for a write when the track is unloaded mid-play. */
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

/** Feed one status tick; `write` is what to send now, if anything. */
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

/** The track is unloaded (another track, the player cleared): a play in progress writes its place. */
export function flushProgress(
	tracker: ProgressTracker,
	family: "support" | "music" | undefined
): ProgressWrite | null {
	return family === "support" && tracker.wasPlaying
		? { positionSec: tracker.positionSec }
		: null;
}
