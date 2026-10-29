import type { QuietReturnTier } from "@/features/reflect/quiet-return-copy";

export type UserVariant =
	| { kind: "first-time" }
	| { kind: "returning" }
	| { kind: "active" };

export type ReflectionStateName =
	| "idle"
	| "typing"
	| "typing-nudge"
	| "processing"
	| "mirror"
	| "clarify"
	| "gave-up"
	| "path-selection"
	| "escalation"
	| "error";

export type EntryType = "typed" | "scaffold" | "hybrid" | "voice";

export type FeedbackType = "not_quite" | "say_more";

/** The chip picked in the "What didn't land?" sheet. */
export type MissReason =
	| "wrong_emotion"
	| "too_surface_level"
	| "close_but_not_quite"
	| "missed_the_main_thing";

export type ReflectionAction =
	| { type: "TAP_INPUT" }
	| { type: "DISMISS_TYPING" }
	| { type: "DISCARD_DRAFT" }
	| { type: "TEXT_CHANGE"; text: string }
	| { type: "TOGGLE_TEXTURE"; word: string }
	| { type: "SCAFFOLD_SUBMIT" }
	| { type: "PAUSE_TIMEOUT" }
	| { type: "RESUME_TYPING" }
	| { type: "SUBMIT" }
	| { type: "THATS_IT" }
	| { type: "NOT_QUITE" }
	| { type: "SAY_MORE" }
	| { type: "MISS_REASON"; reason: MissReason }
	| { type: "CLARIFY_TEXT_CHANGE"; text: string }
	| { type: "SET_QUIET_RETURN"; tier: QuietReturnTier | null }
	| { type: "RESET" }
	| { type: "ACCOUNT_SWITCHED"; entryText: string }
	| { type: "SESSION_ERROR"; message: string }
	| { type: "SESSION_RESUMED"; screen: ReflectionStateName }
	| { type: "VOICE_START" }
	| { type: "VOICE_TRANSCRIPT"; text: string }
	/** Plus dictation: a finished take, appended after whatever is written now. */
	| { type: "VOICE_APPEND"; text: string }
	| { type: "BACK_TO_MIRROR" }
	| { type: "CLEAR_TEXTURES" };

export interface ReflectionState {
	clarifyText: string;
	entryText: string;
	entryType: EntryType;
	errorMessage: string;
	lastFeedbackType: FeedbackType | null;
	missReason: MissReason | null;
	quietReturn: QuietReturnTier | null;
	screen: ReflectionStateName;
	selectedTextures: string[];
}
