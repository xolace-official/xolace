import { joinDictation } from "@/features/reflect/hooks/dictation-transcript";
import { MAX_TEXTURES } from "@/features/reflect/texture-sets";
import type {
	EntryType,
	ReflectionAction,
	ReflectionState,
} from "@/features/reflect/types";

export const MAX_TURNS = 2;

export const initialState: ReflectionState = {
	clarifyText: "",
	entryText: "",
	entryType: "typed",
	errorMessage: "",
	lastFeedbackType: null,
	missReason: null,
	quietReturn: null,
	screen: "idle",
	selectedTextures: [],
};

/** Produces the next reflection UI state for an action. */
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

		// Closing the composer keeps the draft; it is discarded explicitly (#258).
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

		case "SET_QUIET_RETURN":
			return { ...state, quietReturn: action.tier };

		case "SESSION_ERROR":
			return { ...state, errorMessage: action.message, screen: "error" };

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

		// Nothing of the previous person's composer survives into the next one's.
		case "ACCOUNT_SWITCHED":
			return { ...initialState, entryText: action.entryText };

		default:
			return state;
	}
}
