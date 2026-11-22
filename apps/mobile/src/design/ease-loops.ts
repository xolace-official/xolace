import { useState } from "react";
import {
	type AnimateProps,
	type CubicBezier,
	delayed,
	EASING,
	type EaseProps,
	NONE,
} from "./ease";

type LoopOptions = {
	from: AnimateProps;
	to: AnimateProps;
	periodMs: number;
	reduced: boolean;
	mode?: "reverse" | "repeat";
	easing?: CubicBezier | "linear";
	delay?: number;
};

export const rest = (from: AnimateProps): EaseProps => ({
	animate: from,
	initialAnimate: from,
	transition: NONE,
});

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

export function leadInDone(
	run: LoopRun,
	running: boolean,
	finished: boolean
): LoopRun {
	return finished && running && !run.looping ? { ...run, looping: true } : run;
}

export function useLoopRun(running: boolean, periodMs = 0): number {
	const timing = String(periodMs);
	const [run, setRun] = useState(() => startRun(running, timing));
	const next = runFor(run, running, timing);
	if (next !== run) {
		setRun(next);
	}
	return next.n;
}

export const SETTLE_BACK_MS = 400;

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
