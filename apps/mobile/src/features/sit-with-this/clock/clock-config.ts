import type { RunState } from "../run/sit-run";
import { type Beat, isBreathing } from "../sit-model";
import { durOf } from "../sit-timing";
import { PATTERNS, type PhaseKind, type Step } from "./breath";

export const K = {
	breath: 2,
	haptic: 4,
	mirror: 1,
	prompt: 5,
	sync: 3,
	text: 0,
} as const;
export const MODE = { close: 2, play: 1, pre: 0 } as const;

export type ClockCfg = {
	serial: number;
	mode: number;
	kind: number;
	steps: readonly Step[];
	cyc: number;
	d: number;
	seek: number;
	split: boolean;
	playRun: number;
};

export const IDLE_CFG: ClockCfg = {
	cyc: 0,
	d: -1,
	kind: K.text,
	mode: MODE.pre,
	playRun: -1,
	seek: 0,
	serial: -1,
	split: false,
	steps: [],
};

export function clockCfg(run: RunState, beat: Beat): ClockCfg {
	const breath = beat.k === "breath" || beat.k === "sync";
	const d = durOf(beat);
	return {
		cyc: breath ? beat.cyc : 0,
		d: run.stage === "play" && Number.isFinite(d) ? d : -1,
		kind: K[beat.k],
		mode: MODE[run.stage],
		playRun: run.playRun,
		seek: run.seek,
		serial: run.serial,
		split: isBreathing(beat.k) && typeof beat.t !== "string",
		steps: breath ? PATTERNS[beat.pat] : [],
	};
}

export type ClockEvents = {
	phase: (
		serial: number,
		kind: PhaseKind,
		ms: number,
		caption: number,
		first: boolean
	) => void;
	pulse: (serial: number) => void;
	beatEnd: (serial: number) => void;
	linkReady: () => void;
	doneReady: (serial: number) => void;
};
