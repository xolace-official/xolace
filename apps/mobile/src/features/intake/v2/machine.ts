/** The intake v2 ("Talk to Flux", #704) client flow as one pure reducer. */
import {
	type Chip,
	type Heard,
	NOTHING_HEARD,
	toggleChip,
} from "@/features/intake/v2/heard";

/** The name field's cap, the same as v1's. */
export const NAME_MAX_CHARS = 30;

export type IntakeV2Step =
	| "ask" // Flux asks; quick replies, type, or talk
	| "listen" // live transcript
	| "type"
	| "interpret" // "listening back" while the answer is read
	| "followUp" // at most one, only when a key field is unclear
	| "heard" // chips, tap off to drop
	| "name"
	| "safety" // safeguard elevated/crisis: crisis support, no Xolace+
	| "plus" // the Xolace+ screen; skipped if entitled
	| "done"; // intake.v2.complete, then the Mirror

/** How the answer came in. Talk (`voice`) arrives with the listen step. */
export type AnswerMode = "quick_reply" | "typed" | "voice" | "skipped";

/** Where the chips came from: the model's reading, or the pick-list it falls back to. */
export type HeardSource = "model" | "pick_list";

export type IntakeV2State = {
	/** The user's own words; empty when skipped. Never leaves the device but to the reader. */
	answer: string;
	/** What's in the type step's field, before it is sent. */
	draft: string;
	heard: Heard;
	mode: AnswerMode | null;
	name: string;
	/** How `heard` was filled; null until the answer has been read. */
	read: HeardSource | null;
	step: IntakeV2Step;
};

export type IntakeV2Action =
	| { type: "START_TYPING" }
	| { type: "QUICK_REPLY"; text: string }
	| { type: "SKIP" }
	| { type: "DRAFT_CHANGE"; text: string }
	| { type: "SEND" }
	| { type: "READ_FAILED" }
	| ({ type: "TOGGLE_CHIP" } & Chip)
	| { type: "CONFIRM_HEARD" }
	| { type: "SAY_AGAIN" }
	/** An edit or a dice roll. */
	| { type: "NAME_CHANGE"; name: string }
	| { type: "KEEP_NAME" }
	| { type: "COMPLETE_FAILED" };

export const initialIntakeV2State = (name: string): IntakeV2State => ({
	answer: "",
	draft: "",
	heard: NOTHING_HEARD,
	mode: null,
	name,
	read: null,
	step: "ask",
});

export function intakeV2Reducer(
	state: IntakeV2State,
	action: IntakeV2Action
): IntakeV2State {
	switch (action.type) {
		case "START_TYPING":
			return state.step === "ask" ? { ...state, step: "type" } : state;
		case "QUICK_REPLY":
			return state.step === "ask"
				? {
						...state,
						answer: action.text,
						mode: "quick_reply",
						step: "interpret",
					}
				: state;
		// Defaults: nothing heard, so the first session runs on its own defaults.
		case "SKIP":
			return state.step === "ask"
				? {
						...state,
						answer: "",
						heard: NOTHING_HEARD,
						mode: "skipped",
						step: "name",
					}
				: state;
		case "DRAFT_CHANGE":
			return state.step === "type" ? { ...state, draft: action.text } : state;
		case "SEND": {
			const answer = state.draft.trim();
			if (state.step !== "type" || answer.length === 0) {
				return state;
			}
			return { ...state, answer, mode: "typed", step: "interpret" };
		}
		// The same chips, none picked: the intake never gets stuck on a failed read.
		case "READ_FAILED":
			return state.step === "interpret"
				? { ...state, heard: NOTHING_HEARD, read: "pick_list", step: "heard" }
				: state;
		case "TOGGLE_CHIP": {
			if (state.step !== "heard") {
				return state;
			}
			const { type: _, ...chip } = action;
			return { ...state, heard: toggleChip(state.heard, chip) };
		}
		case "CONFIRM_HEARD":
			return state.step === "heard" ? { ...state, step: "name" } : state;
		// Talk arrives with the listen step; until then, again means typing it.
		case "SAY_AGAIN":
			return state.step === "heard"
				? {
						...state,
						draft: "",
						heard: NOTHING_HEARD,
						read: null,
						step: "type",
					}
				: state;
		case "NAME_CHANGE":
			return state.step === "name"
				? { ...state, name: action.name.slice(0, NAME_MAX_CHARS) }
				: state;
		// No "Hey, name" beat after it (#707). The Xolace+ screen (`plus`) goes in
		// here once it exists.
		case "KEEP_NAME": {
			const name = state.name.trim();
			if (state.step !== "name" || name.length === 0) {
				return state;
			}
			return { ...state, name, step: "done" };
		}
		// Intake has no back edge, so a failed write must leave a live button.
		case "COMPLETE_FAILED":
			return state.step === "done" ? { ...state, step: "name" } : state;
		default:
			return state;
	}
}
