import { useState } from "react";
import {
	type AnimateProps,
	type CubicBezier,
	delayed,
	EASING,
	type EaseProps,
	NONE,
} from "./ease";

/**
 * Infinite loops on react-native-ease: what new Ease code is for. A Reanimated loop writes props
 * every frame for as long as it is on screen; an Ease loop is one native animation. Every big
 * idle-CPU drop in the redesign came from removing a screen's last per-frame Reanimated loop.
 *
 * Ease 0.9 (iOS) loops only the animation a view mounts with (`initialAnimate` → `animate`),
 * and a view mounted while `paused` never starts its loop. So stop a loop by easing it back to
 * rest (`loopOrSettle`), never with `paused`, and key its EaseView with `useLoopRun` (or by
 * period) so it remounts to start again. No `borderColor` (Ease strips it and the border turns
 * black: wrap a plain bordered View) and no `skewX`.
 */

type LoopOptions = {
	/** The resting value: where the loop starts, and all that shows when reduced. */
	from: AnimateProps;
	/** The far end of the loop. */
	to: AnimateProps;
	/** One full cycle in ms (there and back for "reverse"). */
	periodMs: number;
	reduced: boolean;
	/** "reverse" goes there and back (a breath); "repeat" restarts (a spinner). */
	mode?: "reverse" | "repeat";
	easing?: CubicBezier | "linear";
	/** Before the first cycle only (Ease applies a loop's delay once). */
	delay?: number;
};

/** At rest at `from`: nothing animates. */
export const rest = (from: AnimateProps): EaseProps => ({
	animate: from,
	initialAnimate: from,
	transition: NONE,
});

/**
 * An infinite loop. Reduced (or a period of 0): no loop, the element rests at `from`.
 *
 * Ease restarts a loop only when an `animate` value changes, not when its duration does. If the
 * period can change while mounted (the night slowdown), key the EaseView with
 * `useLoopRun(running, periodMs)`.
 */
export function loopProps({
	from,
	to,
	periodMs,
	reduced,
	mode = "reverse",
	easing = EASING.sineInOut,
	delay = 0,
}: LoopOptions): EaseProps {
	if (reduced || periodMs <= 0) {
		return rest(from);
	}
	const duration = mode === "reverse" ? periodMs / 2 : periodMs;
	return {
		animate: to,
		initialAnimate: from,
		transition: delayed(
			{ duration, easing, loop: mode, type: "timing" },
			delay
		),
	};
}

/** Where a stoppable loop is: how many times it has (re)started, whether its lead-in is done
 * (`usePhasedBreath`), and the `running` and timing it last saw. */
export type LoopRun = {
	looping: boolean;
	n: number;
	timing: string;
	was: boolean;
};

export const startRun = (running: boolean, timing = ""): LoopRun => ({
	looping: false,
	n: 0,
	timing,
	was: running,
});

/**
 * The run for this render. Turning on, or a new timing (the night slowdown) while running,
 * starts it again: `n` moves on, so a key built on it remounts the EaseView (Ease restarts a
 * loop only on remount) and a phased breath plays its lead-in again. Same input, same object.
 */
export function runFor(
	run: LoopRun,
	running: boolean,
	timing: string
): LoopRun {
	if (run.was === running && run.timing === timing) {
		return run;
	}
	const restart = running && !(run.was && run.timing === timing);
	return { looping: false, n: run.n + (restart ? 1 : 0), timing, was: running };
}

/** A phased breath's lead-in ended: from here it loops whole halves. */
export function leadInDone(
	run: LoopRun,
	running: boolean,
	finished: boolean
): LoopRun {
	return finished && running && !run.looping ? { ...run, looping: true } : run;
}

/**
 * A key for a loop that stops and starts again, or whose period changes while mounted: it moves
 * on each time `running` turns on or `periodMs` changes while running.
 *
 * @public For the stoppable loops (Aura, Flux, Today's glow), ported from F5 on.
 */
export function useLoopRun(running: boolean, periodMs = 0): number {
	const timing = String(periodMs);
	const [run, setRun] = useState(() => startRun(running, timing));
	const next = runFor(run, running, timing);
	if (next !== run) {
		setRun(next);
	}
	return next.n;
}

/** How long a stopped loop takes to ease back to rest (`loopOrSettle`). */
export const SETTLE_BACK_MS = 400;

/**
 * A loop that runs while `running` and otherwise eases back to `from` and stops, so nothing
 * native keeps running while hidden. Reduced: rests at `from` at once. Key the EaseView with
 * `useLoopRun(running)` so the loop starts again after a stop.
 */
export function loopOrSettle(
	options: LoopOptions & { running: boolean }
): EaseProps {
	const { running, ...loop } = options;
	if (running && !loop.reduced) {
		return loopProps(loop);
	}
	return {
		animate: loop.from,
		initialAnimate: loop.from,
		transition: loop.reduced
			? NONE
			: {
					duration: SETTLE_BACK_MS,
					easing: EASING.inOutQuad,
					type: "timing",
				},
	};
}
