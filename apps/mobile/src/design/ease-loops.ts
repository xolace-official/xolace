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
 * period can change while mounted (the night slowdown), put `periodMs` in the EaseView's `key`.
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

/**
 * A key for a loop that stops and starts again: it moves on each time `running` turns on, so
 * the EaseView remounts and its loop runs again.
 *
 * @public For the stoppable loops (Aura, Flux, Today's glow), ported from F5 on.
 */
export function useLoopRun(running: boolean): number {
	const [run, setRun] = useState({ n: 0, was: running });
	if (run.was !== running) {
		setRun({ n: run.n + (running ? 1 : 0), was: running });
	}
	return run.n;
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
