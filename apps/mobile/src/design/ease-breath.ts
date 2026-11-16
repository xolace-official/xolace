import { useState } from "react";
import {
	type AnimateProps,
	type CubicBezier,
	EASING,
	type EaseProps,
	type Transition,
} from "./ease";
import { leadInDone, loopProps, rest, runFor, startRun } from "./ease-loops";

/**
 * The breath on Ease: a sine there and back, and a breath that starts partway through its
 * cycle so pieces breathing out of step (Today's chime bars) show that offset from their first
 * frame. Same rules as `ease-loops.ts`: reduced or stopped, it rests at `from`.
 */

/** How far a breath half is, 0 → 1, `u` of the way through it (a sine half). */
export function breathAt(u: number): number {
	return 0.5 - 0.5 * Math.cos(Math.PI * u);
}

/**
 * The rest of a breath half, for a loop that starts partway through it, as a bezier. A sine
 * half is c(z) = ½ − ½·cos(πz); starting at `u`, the part still to play (scaled 0 → 1) is
 * matched by a cubic Hermite curve: x handles at ⅓ and ⅔, y handles from the slope at each end
 * (the far end is flat). Ease can't start a loop mid-cycle, so `usePhasedBreath` plays this
 * lead-in first.
 */
export function breathRest(u: number): CubicBezier {
	const left = 1 - u;
	const done = breathAt(u);
	if (left <= 0 || done >= 1) {
		return EASING.sineInOut;
	}
	const slope = ((Math.PI / 2) * Math.sin(Math.PI * u) * left) / (1 - done);
	return [1 / 3, slope / 3, 2 / 3, 1];
}

/** The breath (`BREATH` in springs.ts): a sine there and back over `periodMs`. */
export function breathProps(
	periodMs: number,
	reduced: boolean,
	from: AnimateProps,
	to: AnimateProps
): EaseProps {
	return loopProps({ from, periodMs, reduced, to });
}

/** Below a frame and a bit, a lead-in isn't worth an animation of its own. */
const MIN_LEAD_MS = 20;

type PhasedBreath = {
	/** The low end: where the cycle starts, and the resting value. */
	from: AnimateProps;
	to: AnimateProps;
	/** One full cycle (there and back) in ms. */
	periodMs: number;
	/** How far into the cycle it starts, in ms (a CSS negative delay, as a positive number). */
	phaseMs: number;
	/** Off: rest at `from`, at once. */
	running: boolean;
	/** Reduced motion: no breath, it rests at `from`. */
	reduced: boolean;
	/** One value between `from` and `to` (0 → 1). */
	mix: (k: number) => AnimateProps;
};

/** Where a phased breath starts: which way it is going, and how far through that half. */
export function breathPhase(periodMs: number, phaseMs: number) {
	const half = periodMs / 2;
	const phase = ((phaseMs % periodMs) + periodMs) % periodMs;
	const rising = phase < half;
	const u = (rising ? phase : phase - half) / half;
	return { half, leadMs: (1 - u) * half, rising, u };
}

/**
 * A breath that starts partway through its cycle, so elements breathing out of step show that
 * offset from their first frame. It plays the rest of the current half (`breathRest`), then
 * remounts at that end and loops whole halves. Stopped, reduced or with no period, it rests at
 * `from` at once.
 *
 * Spread `props` onto the EaseView and pass `key` and `onTransitionEnd` with them.
 *
 * @public For Today's chime bars (S1).
 */
export function usePhasedBreath({
	from,
	to,
	periodMs,
	phaseMs,
	running,
	reduced,
	mix,
}: PhasedBreath): {
	props: EaseProps;
	key: string;
	onTransitionEnd: (e: { finished: boolean }) => void;
} {
	const on = running && !reduced && periodMs > 0;
	const timing = `${periodMs}/${phaseMs}`;
	const [run, setRun] = useState(() => startRun(on, timing));
	const now = runFor(run, on, timing);
	if (now !== run) {
		setRun(now);
	}
	// A new run (turned on, or a new period or phase) remounts and plays the lead-in again; the
	// loop then mounts afresh where the lead-in ended (Ease loops only what a view mounts with).
	const key = `${now.n}-${now.looping ? "loop" : "lead"}`;
	const onTransitionEnd = ({ finished }: { finished: boolean }) => {
		// Only this run's lead-in counts: a late end from an earlier run changes nothing.
		setRun((current) =>
			current.n === now.n ? leadInDone(current, on, finished) : current
		);
	};
	if (!on) {
		return { key, onTransitionEnd, props: rest(from) };
	}
	const { half, rising, u, leadMs } = breathPhase(periodMs, phaseMs);
	const end = rising ? to : from;
	const other = rising ? from : to;
	const loop: Transition = {
		duration: half,
		easing: EASING.sineInOut,
		loop: "reverse",
		type: "timing",
	};
	// Too little of the half left to play on its own, or the lead-in is done: loop from the turn.
	if (leadMs < MIN_LEAD_MS || now.looping) {
		return {
			key,
			onTransitionEnd,
			props: { animate: other, initialAnimate: end, transition: loop },
		};
	}
	const k = breathAt(u);
	return {
		key,
		onTransitionEnd,
		props: {
			animate: end,
			initialAnimate: mix(rising ? k : 1 - k),
			transition: { duration: leadMs, easing: breathRest(u), type: "timing" },
		},
	};
}
