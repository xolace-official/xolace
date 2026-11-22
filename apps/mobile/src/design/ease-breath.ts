import { useState } from "react";
import {
	type AnimateProps,
	type CubicBezier,
	EASING,
	type EaseProps,
	type Transition,
} from "./ease";
import { leadInDone, loopProps, rest, runFor, startRun } from "./ease-loops";

export function breathAt(u: number): number {
	return 0.5 - 0.5 * Math.cos(Math.PI * u);
}

export function breathRest(u: number): CubicBezier {
	const left = 1 - u;
	const done = breathAt(u);
	if (left <= 0 || done >= 1) {
		return EASING.sineInOut;
	}
	const slope = ((Math.PI / 2) * Math.sin(Math.PI * u) * left) / (1 - done);
	return [1 / 3, slope / 3, 2 / 3, 1];
}

export function breathProps(
	periodMs: number,
	reduced: boolean,
	from: AnimateProps,
	to: AnimateProps
): EaseProps {
	return loopProps({ from, periodMs, reduced, to });
}

const MIN_LEAD_MS = 20;

type PhasedBreath = {
	from: AnimateProps;
	to: AnimateProps;
	periodMs: number;
	phaseMs: number;
	running: boolean;
	reduced: boolean;
	mix: (k: number) => AnimateProps;
};

export function breathPhase(periodMs: number, phaseMs: number) {
	const half = periodMs / 2;
	const phase = ((phaseMs % periodMs) + periodMs) % periodMs;
	const rising = phase < half;
	const u = (rising ? phase : phase - half) / half;
	return { half, leadMs: (1 - u) * half, rising, u };
}

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
	const key = `${now.n}-${now.looping ? "loop" : "lead"}`;
	const onTransitionEnd = ({ finished }: { finished: boolean }) => {
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
