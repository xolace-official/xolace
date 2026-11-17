/**
 * What the clock is told about the current beat, as plain numbers for the
 * worklet. React hands it over on beat changes only (`use-sit-clock.ts`).
 */
import type { RunState } from "../run/sit-run";
import { type Beat, isBreathing } from "../sit-model";
import { durOf } from "../sit-timing";
import { PATTERNS, type PhaseKind, type Step } from "./breath";

/** Beat kinds as numbers, for the worklet. */
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
	/** ms, or −1 for an untimed beat (the prompt). */
	d: number;
	/** Start this far in (a dev state's frozen frame). */
	seek: number;
	/** Make room: the caption follows the phase (0 the in-line, 1 the out-line). */
	split: boolean;
	/** Bumped when playing (re)starts. */
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

/** The clock's config for the run's current beat. */
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

/** What the clock tells the JS side, in the frame it happens. */
export type ClockEvents = {
	/** A breath phase began (`first`: the beat's first): its haptic, and VoiceOver hears it. */
	phase: (
		serial: number,
		kind: PhaseKind,
		ms: number,
		caption: number,
		first: boolean
	) => void;
	/** A hand pulse. */
	pulse: (serial: number) => void;
	/** The beat's time is up. */
	beatEnd: (serial: number) => void;
	/** 3 s of playing: "Something different" may show. */
	linkReady: () => void;
	/** "You stayed."'s Done has drained. */
	doneReady: (serial: number) => void;
};
