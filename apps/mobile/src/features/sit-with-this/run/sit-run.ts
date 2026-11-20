import type { Stage } from "../sit-model";

export type RunState = {
	stage: Stage;
	beat: number;
	serial: number;
	playRun: number;
	paused: boolean;
	linkOn: boolean;
	doneOn: boolean;
	seek: number;
};

export type RunAction =
	| { type: "begin"; total: number }
	| { type: "advance"; serial: number; total: number }
	| { type: "pause"; paused: boolean }
	| { type: "linkReady" }
	| { type: "doneReady"; serial: number };

export type RunStart = {
	preRoll: boolean;
	total: number;
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

export type SitScene = {
	at?: RunStart["at"];
	hold?: boolean;
	reduced?: boolean;
};

export const breathFelt = (s: {
	reduced: boolean;
	inFront: boolean;
	frozen: boolean;
}) => !s.reduced && s.inFront && !s.frozen;
