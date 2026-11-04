/** The intake v2 ("Talk to Flux", #704) client flow as one pure reducer. */
import {
	type Chip,
	type FollowUp,
	type Heard,
	heardNothing,
	heardOf,
	NOTHING_HEARD,
	type Reading,
	type SafetyResource,
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
	/** The one follow-up this answer was asked; set, no second is asked. */
	followUp: FollowUp | null;
	followUpDraft: string;
	/** The reply, once sent: the next read carries it. */
	followUpReply: string | null;
	heard: Heard;
	mode: AnswerMode | null;
	name: string;
	/** How `heard` was filled; null until the answer has been read. */
	read: HeardSource | null;
	/** `heard` as the model read it, before any tap: what the chip counts compare against. */
	readAs: Heard;
	/** What `safety` shows: the safeguard's own resources for this answer. */
	resources: SafetyResource[];
	/** The answer went to `safety`: no Xolace+ on the way to the Mirror (#704). */
	safetyRouted: boolean;
	step: IntakeV2Step;
};

export type IntakeV2Action =
	| { type: "START_TYPING" }
	| { type: "QUICK_REPLY"; text: string }
	| { type: "SKIP" }
	| { type: "DRAFT_CHANGE"; text: string }
	| { type: "SEND" }
	| { type: "READ_DONE"; reading: Reading }
	| { type: "READ_FAILED" }
	| { type: "FOLLOW_UP_DRAFT_CHANGE"; text: string }
	| { type: "FOLLOW_UP_SEND" }
	| { type: "FOLLOW_UP_SKIP" }
	| { type: "SAFETY_CONTINUE" }
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
	followUp: null,
	followUpDraft: "",
	followUpReply: null,
	heard: NOTHING_HEARD,
	mode: null,
	name,
	read: null,
	readAs: NOTHING_HEARD,
	resources: [],
	safetyRouted: false,
	step: "ask",
});

/** A new answer: nothing heard, and its own follow-up still to ask. */
const FRESH_READ = {
	followUp: null,
	followUpDraft: "",
	followUpReply: null,
	heard: NOTHING_HEARD,
	read: null,
	readAs: NOTHING_HEARD,
	resources: [],
} as const satisfies Partial<IntakeV2State>;

function afterReading(state: IntakeV2State, reading: Reading): IntakeV2State {
	// Safeguard first: no chips, and nothing on the way to the name sells anything.
	if (reading.route === "safety") {
		return {
			...state,
			heard: NOTHING_HEARD,
			read: null,
			readAs: NOTHING_HEARD,
			resources: reading.resources,
			safetyRouted: true,
			step: "safety",
		};
	}
	const heard = heardOf(reading.fields);
	const read: HeardSource = heardNothing(heard) ? "pick_list" : "model";
	const next = { ...state, heard, read, readAs: heard };
	// One follow-up per answer, whatever a later reading asks.
	if (reading.followUp && state.followUp === null) {
		return { ...next, followUp: reading.followUp, step: "followUp" };
	}
	return { ...next, step: "heard" };
}

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
		case "READ_DONE":
			return state.step === "interpret"
				? afterReading(state, action.reading)
				: state;
		// The intake never gets stuck on a failed read: the first reading's chips if a
		// follow-up's re-read failed, else the same chips, none picked.
		case "READ_FAILED":
			if (state.step !== "interpret") {
				return state;
			}
			return state.read === null
				? { ...state, heard: NOTHING_HEARD, read: "pick_list", step: "heard" }
				: { ...state, step: "heard" };
		case "FOLLOW_UP_DRAFT_CHANGE":
			return state.step === "followUp"
				? { ...state, followUpDraft: action.text }
				: state;
		case "FOLLOW_UP_SEND": {
			const reply = state.followUpDraft.trim();
			if (state.step !== "followUp" || reply.length === 0) {
				return state;
			}
			return { ...state, followUpReply: reply, step: "interpret" };
		}
		case "FOLLOW_UP_SKIP":
			return state.step === "followUp" ? { ...state, step: "heard" } : state;
		// On to the name; `safetyRouted` keeps the Xolace+ step, once it exists, out of the way.
		case "SAFETY_CONTINUE":
			return state.step === "safety" ? { ...state, step: "name" } : state;
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
				? { ...state, ...FRESH_READ, draft: "", step: "type" }
				: state;
		case "NAME_CHANGE":
			return state.step === "name"
				? { ...state, name: action.name.slice(0, NAME_MAX_CHARS) }
				: state;
		// No "Hey, name" beat after it (#707). The Xolace+ screen (`plus`) goes in
		// here once it exists, skipped when `safetyRouted`.
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
