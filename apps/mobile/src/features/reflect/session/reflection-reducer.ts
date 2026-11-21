import type {
	EntryType,
	ReflectionAction,
	ReflectionState,
	TypingClock,
} from "@/features/reflect/session/types";
import { MAX_TEXTURES } from "@/features/reflect/texture-sets";
import { joinDictation } from "@/lib/speech/dictation-transcript";

export const initialState: ReflectionState = {
	clarifyText: "",
	entryText: "",
	entryType: "typed",
	errorCode: null,
	errorMessage: "",
	lastFeedbackType: null,
	missReason: null,
	screen: "idle",
	selectedTextures: [],
	typing: { froze: false, frozeAt: null, frozeMs: undefined, startedAt: null },
};

/** `reducer`, plus the typing clock, stamped with when the action was dispatched. */
export function timedReducer(
	state: ReflectionState,
	action: ReflectionAction & { at: number }
): ReflectionState {
	const next = reducer(state, action);
	if (next.screen === state.screen) {
		return next;
	}
	const typing = clockTyping(next.typing, next.screen, action.at);
	return typing === next.typing ? next : { ...next, typing };
}

function clockTyping(
	clock: TypingClock,
	screen: ReflectionState["screen"],
	at: number
): TypingClock {
	if (screen === "typing-nudge") {
		return { ...clock, froze: true, frozeAt: at };
	}
	if (screen !== "typing") {
		return clock;
	}
	const resumed =
		clock.frozeAt === null
			? clock
			: {
					...clock,
					frozeAt: null,
					frozeMs: (clock.frozeMs ?? 0) + (at - clock.frozeAt),
				};
	return resumed.startedAt === null ? { ...resumed, startedAt: at } : resumed;
}

export function reducer(
	state: ReflectionState,
	action: ReflectionAction
): ReflectionState {
	switch (action.type) {
		case "TAP_INPUT":
			return {
				...state,
				entryType: state.selectedTextures.length > 0 ? "hybrid" : "typed",
				screen: "typing",
			};

		case "DISMISS_TYPING":
			return { ...state, screen: "idle" };

		case "DISCARD_DRAFT":
			return { ...state, entryText: "" };

		case "TEXT_CHANGE": {
			const entryType: EntryType =
				state.selectedTextures.length > 0 ? "hybrid" : "typed";
			return { ...state, entryText: action.text, entryType, screen: "typing" };
		}

		case "TOGGLE_TEXTURE": {
			if (state.selectedTextures.includes(action.word)) {
				return {
					...state,
					selectedTextures: state.selectedTextures.filter(
						(w) => w !== action.word
					),
				};
			}
			if (state.selectedTextures.length >= MAX_TEXTURES) {
				return state;
			}
			return {
				...state,
				selectedTextures: [...state.selectedTextures, action.word],
			};
		}

		case "SCAFFOLD_SUBMIT":
			return { ...state, entryType: "scaffold", screen: "processing" };

		case "PAUSE_TIMEOUT":
			if (state.screen !== "typing") {
				return state;
			}
			return { ...state, screen: "typing-nudge" };

		case "RESUME_TYPING":
			return { ...state, screen: "typing" };

		case "SUBMIT":
			return { ...state, clarifyText: "", screen: "processing" };

		case "THATS_IT":
			return { ...state, screen: "path-selection" };

		case "NOT_QUITE":
			return {
				...state,
				lastFeedbackType: "not_quite",
				missReason: null,
				screen: "clarify",
			};

		case "SAY_MORE":
			return {
				...state,
				lastFeedbackType: "say_more",
				missReason: null,
				screen: "clarify",
			};

		case "MISS_REASON":
			return { ...state, missReason: action.reason };

		case "BACK_TO_MIRROR":
			return { ...state, clarifyText: "", screen: "mirror" };

		case "CLARIFY_TEXT_CHANGE":
			return { ...state, clarifyText: action.text };

		case "SESSION_ERROR":
			return {
				...state,
				errorCode: action.code ?? null,
				errorMessage: action.message,
				screen: "error",
			};

		case "SESSION_RESUMED":
			return { ...state, screen: action.screen };

		case "VOICE_START":
			return { ...state, entryType: "voice", screen: "typing" };

		case "VOICE_TRANSCRIPT":
			return {
				...state,
				entryText: action.text,
				entryType: "voice",
				screen: "typing",
			};

		case "VOICE_APPEND":
			return {
				...state,
				entryText: joinDictation(state.entryText, action.text),
				entryType: "voice",
				screen: "typing",
			};

		case "CLEAR_TEXTURES":
			return { ...state, selectedTextures: [] };

		case "RESET":
			return initialState;

		case "ACCOUNT_SWITCHED":
			return { ...initialState, entryText: action.entryText };

		default:
			return state;
	}
}
