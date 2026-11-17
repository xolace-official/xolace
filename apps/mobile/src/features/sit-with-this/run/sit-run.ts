/**
 * The run, pure: production's runner (`pre_roll → playing{beat} → close`),
 * plus pause, "Something different" and Done's wait. React holds it; the
 * breath itself lives on the UI thread (`clock/use-sit-clock.ts`), which only
 * reports when a beat has ended or something is ready.
 */
import type { Stage } from "../sit-model";

export type RunState = {
	stage: Stage;
	beat: number;
	/** Bumped on every beat or stage change: the clock restarts on it. */
	serial: number;
	/** Bumped when playing (re)starts: "Something different" waits 3 s of playing again. */
	playRun: number;
	paused: boolean;
	/** "Something different" has waited its 3 s. */
	linkOn: boolean;
	/** "You stayed."'s Done has drained and is enabled. */
	doneOn: boolean;
	/** Start the beat this far in (ms): dev states only. */
	seek: number;
};

export type RunAction =
	| { type: "begin"; total: number }
	/** The clock reached the end of beat `serial`, or Done was tapped on a prompt. */
	| { type: "advance"; serial: number; total: number }
	| { type: "pause"; paused: boolean }
	| { type: "linkReady" }
	| { type: "doneReady"; serial: number };

/** Where a run starts: the first screen, or (after a swap) its first beat. */
export type RunStart = {
	preRoll: boolean;
	/** How many beats the exercise has: none goes straight to the end. */
	total: number;
	/** A dev state's frozen frame: this stage and beat, `seek` ms in. */
	at?: {
		stage: Stage;
		beat?: number;
		seek?: number;
		paused?: boolean;
		linkOn?: boolean;
	};
};

function firstStage(preRoll: boolean, total: number): Stage {
	if (preRoll) {
		return "pre";
	}
	return total === 0 ? "close" : "play";
}

export function startRun({ preRoll, total, at }: RunStart): RunState {
	const stage = at?.stage ?? firstStage(preRoll, total);
	return {
		beat: at?.beat ?? 0,
		doneOn: false,
		linkOn: at?.linkOn ?? false,
		paused: at?.paused ?? false,
		playRun: 0,
		seek: at?.seek ?? 0,
		serial: 0,
		stage,
	};
}

const toClose = (s: RunState): RunState => ({
	...s,
	doneOn: false,
	linkOn: false,
	paused: false,
	seek: 0,
	serial: s.serial + 1,
	stage: "close",
});

export function runReducer(s: RunState, a: RunAction): RunState {
	switch (a.type) {
		case "begin":
			if (s.stage !== "pre") {
				return s;
			}
			if (a.total === 0) {
				return toClose(s);
			}
			return {
				...s,
				beat: 0,
				paused: false,
				playRun: s.playRun + 1,
				seek: 0,
				serial: s.serial + 1,
				stage: "play",
			};
		case "advance": {
			if (a.serial !== s.serial || s.stage !== "play") {
				return s;
			}
			if (s.beat >= a.total - 1) {
				return toClose(s);
			}
			return {
				...s,
				beat: s.beat + 1,
				paused: false,
				seek: 0,
				serial: s.serial + 1,
			};
		}
		case "pause":
			return s.stage === "play" && s.paused !== a.paused
				? { ...s, paused: a.paused }
				: s;
		case "linkReady":
			return s.stage === "play" && !s.linkOn ? { ...s, linkOn: true } : s;
		case "doneReady":
			return a.serial === s.serial && s.stage === "close" && !s.doneOn
				? { ...s, doneOn: true }
				: s;
		default:
			return s;
	}
}

/** A dev state's frame: where the run starts, and whether time holds still there. */
export type SitScene = {
	at?: RunStart["at"];
	/** Freeze the clock without the paused look: a still of a moment mid-motion. */
	hold?: boolean;
	/** Draw as Reduce Motion does, whatever the setting (render 17). */
	reduced?: boolean;
};

/**
 * Whether the breath is felt right now: never under reduced motion (as
 * production), and only while the screen is in front (not under the sheet,
 * not blurred, not in the background) and time is running (not paused). Any
 * other moment stops what's playing.
 */
export const breathFelt = (s: {
	reduced: boolean;
	inFront: boolean;
	frozen: boolean;
}) => !s.reduced && s.inFront && !s.frozen;
