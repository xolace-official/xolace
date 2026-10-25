import type { RunnerAction, RunnerPhase } from "./exercise-runner.types";

export function runnerReducer(
	state: RunnerPhase,
	action: RunnerAction
): RunnerPhase {
	switch (action.type) {
		case "BEGIN":
			return { beatIndex: 0, kind: "playing" };

		case "BEAT_COMPLETE": {
			if (state.kind !== "playing") {
				return state;
			}
			const next = state.beatIndex + 1;
			if (next >= action.totalBeats) {
				return { doneEnabled: false, kind: "close" };
			}
			return { beatIndex: next, kind: "playing" };
		}

		case "UNLOCK_DONE":
			if (state.kind !== "close") {
				return state;
			}
			return { doneEnabled: true, kind: "close" };

		case "DONE":
			return { kind: "done" };

		default:
			return state;
	}
}
