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

/** Room to say it, not to write an essay before the first reflection; a take is held to it too. */
export const ANSWER_MAX_CHARS = 1000;

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

/** How the answer came in; `voice` is a take from `listen`. */
export type AnswerMode = "quick_reply" | "typed" | "voice" | "skipped";

/**
 * Where the chips came from: the model's reading, only its suggestions (read, but not
 * plainly enough to put on), or the pick-list it falls back to.
 */
export type HeardSource = "model" | "suggested" | "pick_list";

/** The mic can't be used: no permission, or no recognizer. It stays off for the intake. */
export type MicFailure = "denied" | "unavailable";

/** How the Xolace+ step (#713) ended; `entitled` is skipped, never shown. */
export type PlusOutcome = "purchased" | "dismissed" | "entitled";

/** The side of the Xolace+ step: the week on free, or with Plus. */
export type PlusSide = "free" | "plus";

/** Why talking fell back to typing. */
export type ListenFailure = MicFailure | "nothing_heard";

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
	/** A late verdict waiting on a purchase or a save, which nothing interrupts. */
	heldSafety: SafetyResource[] | null;
	/** The last try at talking that ended in `type`, for the line it shows there. */
	listenFailed: ListenFailure | null;
	mode: AnswerMode | null;
	name: string;
	/** How the Xolace+ step ended; null before it, or on a safety path that never reached it. */
	plusOutcome: PlusOutcome | null;
	/** Xolace+ was on screen: shown once, and a failed save goes back to it. */
	plusShown: boolean;
	/** How `heard` was filled; null until the answer has been read. */
	read: HeardSource | null;
	/** `heard` as the model read it, before any tap: what the chip counts compare against. */
	readAs: Heard;
	/** What the model half-read: marked on the chips, never put on for them. */
	suggested: Heard;
	/** What `safety` shows: the safeguard's own resources for this answer. */
	resources: SafetyResource[];
	/** Crisis support was shown, for the answer or in the talk demo: no Xolace+ on the way to the Mirror (#704). */
	safetyRouted: boolean;
	step: IntakeV2Step;
	/** Purchases and restores in flight at the store. */
	storeCalls: number;
};

export type IntakeV2Action =
	| { type: "START_TYPING" }
	/** The mic: the permission is asked as `listen` opens, never before. */
	| { type: "START_LISTENING" }
	/** Stopped, or the recognizer ended on its own: what it heard by then. */
	| { type: "LISTEN_DONE"; transcript: string }
	| { type: "MIC_UNAVAILABLE"; reason: MicFailure }
	| { type: "QUICK_REPLY"; text: string }
	| { type: "SKIP" }
	| { type: "DRAFT_CHANGE"; text: string }
	| { type: "SEND" }
	| { type: "READ_DONE"; reading: Reading }
	| { type: "READ_FAILED" }
	/** A read that outlived the client's wait came back as safety, after the fallback. */
	| { type: "LATE_SAFETY"; resources: SafetyResource[] }
	/** A purchase or restore starting or ending. Sent before the store is called. */
	| { type: "STORE_CALL"; active: boolean }
	| { type: "FOLLOW_UP_DRAFT_CHANGE"; text: string }
	| { type: "FOLLOW_UP_SEND" }
	| { type: "FOLLOW_UP_SKIP" }
	| { type: "SAFETY_CONTINUE" }
	| ({ type: "TOGGLE_CHIP" } & Chip)
	| { type: "CONFIRM_HEARD" }
	| { type: "SAY_AGAIN" }
	/** An edit or a dice roll. */
	| { type: "NAME_CHANGE"; name: string }
	/** `entitled`: Xolace+ is already theirs, so `plus` is skipped. */
	| { type: "KEEP_NAME"; entitled: boolean }
	| { type: "PLUS_EXIT"; outcome: PlusOutcome }
	/**
	 * On from crisis support in the talk demo. `purchased` when a purchase went through
	 * while the demo's verdict waited for it.
	 */
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

/** A denied or missing mic stays off for the rest of the intake; asking again only bounces. */
export const micOn = (state: IntakeV2State): boolean =>
	state.listenFailed === null || state.listenFailed === "nothing_heard";

/**
 * What the Mirror's "Pick up where you left off" may quote back. Nothing once crisis support
 * was shown, for the answer or in the talk demo: the first home screen doesn't put those
 * moments back in front of them unasked.
 */
export const firstAnswerToOffer = (state: IntakeV2State): string =>
	state.safetyRouted ? "" : state.answer.trim();

/** A take as an answer: trimmed, and held to a typed answer's length. */
export const voiceAnswer = (transcript: string): string =>
	transcript.trim().slice(0, ANSWER_MAX_CHARS).trim();

/** A new answer: nothing heard, and its own follow-up still to ask. */
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

/**
 * Safeguard first: no chips, and nothing on the way to the name sells anything. Leaving the
 * Xolace+ screen this way is a dismissal, the same as the talk demo's safety exit.
 */
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

/**
 * Support as soon as nothing would break: a purchase in flight is never interrupted, and
 * neither is a save, whose landing leaves the intake.
 */
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

/** The last store call to end on the Xolace+ screen lets a held verdict through. */
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
		// Into typing with its draft intact: nothing said on the way is lost.
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
		// The intake never gets stuck on a failed read: the first reading's chips if a
		// follow-up's re-read failed, else the same chips, none picked.
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
		// On to the name; `safetyRouted` keeps the Xolace+ step out of the way. A late verdict
		// can come after Xolace+ was on screen, and the name was settled before that.
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
		// Again the way it was said: a spoken answer goes back to `listen`, the rest to `type`.
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
		// No "Hey, name" beat after it (#707). Xolace+ once (#713): never on the safety path,
		// never to someone who has it.
		case "KEEP_NAME": {
			const name = state.name.trim();
			if (state.step !== "name" || name.length === 0) {
				return state;
			}
			// The safeguard veto first: nothing on the safety path is about Xolace+ at all.
			if (state.safetyRouted || state.plusShown) {
				return { ...state, name, step: "done" };
			}
			return action.entitled
				? { ...state, name, plusOutcome: "entitled", step: "done" }
				: { ...state, name, plusShown: true, step: "plus" };
		}
		// The first way out stays the outcome: Continue after a failed save doesn't undo a
		// purchase.
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
			// A held verdict waits out every store call, not just the one that exits: the last
			// to end brings support (`afterStoreCall`), with this outcome kept.
			return state.storeCalls > 0 ? exited : toSafety(exited, state.heldSafety);
		}
		// Support was already on screen in the demo, so straight to the save, a held verdict
		// with it. Xolace+ was offered by then, so it counts as dismissed, as in `toSafety`.
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
		// Intake has no back edge, so a failed write must leave a live button: back to the
		// screen the write left from, but never back to Xolace+ after support.
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
