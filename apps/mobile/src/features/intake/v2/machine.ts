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

export const NAME_MAX_CHARS = 30;

export const ANSWER_MAX_CHARS = 1000;

export type IntakeV2Step =
	| "ask"
	| "listen"
	| "type"
	| "interpret"
	| "followUp"
	| "heard"
	| "name"
	| "safety"
	| "plus"
	| "done";

export type AnswerMode = "quick_reply" | "typed" | "voice" | "skipped";

export type HeardSource = "model" | "suggested" | "pick_list";

export type MicFailure = "denied" | "unavailable";

export type PlusOutcome = "purchased" | "dismissed" | "entitled";

export type ListenFailure = MicFailure | "nothing_heard";

export type IntakeV2State = {
	answer: string;
	draft: string;
	followUp: FollowUp | null;
	followUpDraft: string;
	followUpReply: string | null;
	heard: Heard;
	heldSafety: SafetyResource[] | null;
	listenFailed: ListenFailure | null;
	mode: AnswerMode | null;
	name: string;
	plusOutcome: PlusOutcome | null;
	plusShown: boolean;
	read: HeardSource | null;
	readAs: Heard;
	suggested: Heard;
	resources: SafetyResource[];
	safetyRouted: boolean;
	step: IntakeV2Step;
	storeCalls: number;
};

export type IntakeV2Action =
	| { type: "START_TYPING" }
	| { type: "START_LISTENING" }
	| { type: "LISTEN_DONE"; transcript: string }
	| { type: "MIC_UNAVAILABLE"; reason: MicFailure }
	| { type: "QUICK_REPLY"; text: string }
	| { type: "SKIP" }
	| { type: "DRAFT_CHANGE"; text: string }
	| { type: "SEND" }
	| { type: "READ_DONE"; reading: Reading }
	| { type: "READ_FAILED" }
	| { type: "LATE_SAFETY"; resources: SafetyResource[] }
	| { type: "STORE_CALL"; active: boolean }
	| { type: "FOLLOW_UP_DRAFT_CHANGE"; text: string }
	| { type: "FOLLOW_UP_SEND" }
	| { type: "FOLLOW_UP_SKIP" }
	| { type: "SAFETY_CONTINUE" }
	| ({ type: "TOGGLE_CHIP" } & Chip)
	| { type: "CONFIRM_HEARD" }
	| { type: "SAY_AGAIN" }
	| { type: "NAME_CHANGE"; name: string }
	| { type: "KEEP_NAME"; entitled: boolean }
	| { type: "PLUS_EXIT"; outcome: PlusOutcome }
	| { type: "PLUS_SAFETY_EXIT"; outcome?: "purchased" }
	| { type: "COMPLETE_FAILED" };

export const initialIntakeV2State = (name: string): IntakeV2State => ({
	answer: "",
	draft: "",
	followUp: null,
	followUpDraft: "",
	followUpReply: null,
	heard: NOTHING_HEARD,
	heldSafety: null,
	listenFailed: null,
	mode: null,
	name,
	plusOutcome: null,
	plusShown: false,
	read: null,
	readAs: NOTHING_HEARD,
	resources: [],
	safetyRouted: false,
	step: "ask",
	storeCalls: 0,
	suggested: NOTHING_HEARD,
});

export const micOn = (state: IntakeV2State): boolean =>
	state.listenFailed === null || state.listenFailed === "nothing_heard";

export const firstAnswerToOffer = (state: IntakeV2State): string =>
	state.safetyRouted ? "" : state.answer.trim();

export const voiceAnswer = (transcript: string): string =>
	transcript.trim().slice(0, ANSWER_MAX_CHARS).trim();

const FRESH_READ = {
	followUp: null,
	followUpDraft: "",
	followUpReply: null,
	heard: NOTHING_HEARD,
	read: null,
	readAs: NOTHING_HEARD,
	resources: [],
	suggested: NOTHING_HEARD,
} as const satisfies Partial<IntakeV2State>;

function toSafety(
	state: IntakeV2State,
	resources: SafetyResource[]
): IntakeV2State {
	return {
		...state,
		heard: NOTHING_HEARD,
		heldSafety: null,
		plusOutcome:
			state.plusOutcome ?? (state.step === "plus" ? "dismissed" : null),
		read: null,
		readAs: NOTHING_HEARD,
		resources,
		safetyRouted: true,
		step: "safety",
		suggested: NOTHING_HEARD,
	};
}

function afterLateSafety(
	state: IntakeV2State,
	resources: SafetyResource[]
): IntakeV2State {
	if (state.safetyRouted) {
		return state;
	}
	return state.storeCalls > 0 || state.step === "done"
		? { ...state, heldSafety: resources }
		: toSafety(state, resources);
}

function afterStoreCall(state: IntakeV2State, active: boolean): IntakeV2State {
	const storeCalls = Math.max(0, state.storeCalls + (active ? 1 : -1));
	const next = { ...state, storeCalls };
	return storeCalls === 0 && state.heldSafety && state.step === "plus"
		? toSafety(next, state.heldSafety)
		: next;
}

function sourceOf(heard: Heard, suggested: Heard): HeardSource {
	if (!heardNothing(heard)) {
		return "model";
	}
	return heardNothing(suggested) ? "pick_list" : "suggested";
}

function afterReading(state: IntakeV2State, reading: Reading): IntakeV2State {
	if (reading.route === "safety") {
		return toSafety(state, reading.resources);
	}
	const heard = heardOf(reading.fields);
	const suggested = heardOf(reading.suggested ?? {});
	const next = {
		...state,
		heard,
		read: sourceOf(heard, suggested),
		readAs: heard,
		suggested,
	};
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
		case "START_LISTENING":
			return (state.step === "ask" || state.step === "type") && micOn(state)
				? { ...state, listenFailed: null, step: "listen" }
				: state;
		case "LISTEN_DONE": {
			if (state.step !== "listen") {
				return state;
			}
			const answer = voiceAnswer(action.transcript);
			if (answer.length === 0) {
				return { ...state, listenFailed: "nothing_heard", step: "type" };
			}
			return { ...state, answer, mode: "voice", step: "interpret" };
		}
		case "QUICK_REPLY":
			return state.step === "ask"
				? {
						...state,
						answer: action.text,
						mode: "quick_reply",
						step: "interpret",
					}
				: state;
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
		case "MIC_UNAVAILABLE":
			return state.step === "listen"
				? { ...state, listenFailed: action.reason, step: "type" }
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
		case "READ_FAILED":
			if (state.step !== "interpret") {
				return state;
			}
			return state.read === null
				? { ...state, heard: NOTHING_HEARD, read: "pick_list", step: "heard" }
				: { ...state, step: "heard" };
		case "LATE_SAFETY":
			return afterLateSafety(state, action.resources);
		case "STORE_CALL":
			return afterStoreCall(state, action.active);
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
		case "SAFETY_CONTINUE":
			return state.step === "safety"
				? { ...state, step: state.plusShown ? "done" : "name" }
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
		case "SAY_AGAIN":
			return state.step === "heard"
				? {
						...state,
						...FRESH_READ,
						draft: "",
						step: state.mode === "voice" && micOn(state) ? "listen" : "type",
					}
				: state;
		case "NAME_CHANGE":
			return state.step === "name"
				? { ...state, name: action.name.slice(0, NAME_MAX_CHARS) }
				: state;
		case "KEEP_NAME": {
			const name = state.name.trim();
			if (state.step !== "name" || name.length === 0) {
				return state;
			}
			if (state.safetyRouted || state.plusShown) {
				return { ...state, name, step: "done" };
			}
			return action.entitled
				? { ...state, name, plusOutcome: "entitled", step: "done" }
				: { ...state, name, plusShown: true, step: "plus" };
		}
		case "PLUS_EXIT": {
			if (state.step !== "plus") {
				return state;
			}
			const exited = {
				...state,
				plusOutcome: state.plusOutcome ?? action.outcome,
			};
			if (!state.heldSafety) {
				return { ...exited, step: "done" };
			}
			return state.storeCalls > 0 ? exited : toSafety(exited, state.heldSafety);
		}
		case "PLUS_SAFETY_EXIT":
			return state.step === "plus"
				? {
						...state,
						heldSafety: null,
						plusOutcome: state.plusOutcome ?? action.outcome ?? "dismissed",
						safetyRouted: true,
						step: "done",
					}
				: state;
		case "COMPLETE_FAILED":
			if (state.step !== "done") {
				return state;
			}
			if (state.heldSafety) {
				return toSafety(state, state.heldSafety);
			}
			return {
				...state,
				step: state.plusShown && !state.safetyRouted ? "plus" : "name",
			};
		default:
			return state;
	}
}
