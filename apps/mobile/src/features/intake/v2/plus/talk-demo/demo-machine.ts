// The Talk demo behind the Talk card (#714, README § I): Flux's opening line and a voice to
// pick, one thing said (or typed, when the mic is off), Flux's one question back, then the
// way on. The server holds the limits (one turn, one demo); this is only what to show.
import type { api } from "@xolace/backend/convex/_generated/api";
import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import type { FunctionReturnType } from "convex/server";
import { convexErrorCode } from "@/lib/convex-error-code";

export type DemoReply = FunctionReturnType<typeof api.ai.talkDemo.reply.reply>;
type SafetyResource = Extract<
	DemoReply,
	{ route: "safety" }
>["resources"][number];

export type DemoPhase =
	| "opening" // waiting on the server to open it
	| "intro" // Flux's line, the voices, "Try me"
	| "listening"
	| "typing" // the mic is off: say it by typing
	| "thinking" // the line went to Flux
	| "reply" // Flux's question, typing out and spoken
	| "done" // the way on: Keep talking, or back to the week
	| "safety" // the safeguard tripped: crisis support, nothing sold
	| "used" // tried before: the way on, no second go
	| "expired" // sat past the server's cap: nothing spent, open it again
	| "failed";

/** Why the server turned a step away: the demo was spent, it sat past its cap, or else. */
export type Refusal = "used" | "expired" | "error";

export type DemoState = {
	audioUrl: string | null;
	draft: string;
	line: string;
	micOff: boolean;
	mode: "voice" | "type" | null;
	phase: DemoPhase;
	reply: string | null;
	resources: readonly SafetyResource[];
	voice: VoiceSlug;
};

export type DemoAction =
	| { type: "OPENED" }
	| { type: "OPEN_REFUSED"; reason: Refusal }
	| { type: "PICK_VOICE"; voice: VoiceSlug }
	| { type: "TRY" }
	| { type: "HEARD"; transcript: string }
	| { type: "MIC_FAILED" }
	| { type: "DRAFT"; text: string }
	| { type: "SEND" }
	| { type: "BACK" }
	| { type: "REPLIED"; reply: DemoReply }
	| { type: "REPLY_REFUSED"; reason: Refusal }
	| { type: "SAID" };

/** The server's own cap on a line; a take is cut to it rather than turned away. */
export const LINE_MAX_CHARS = 1000;

/** Wren: warm and unhurried, the prototype's pick. */
const DEFAULT_VOICE: VoiceSlug = "wren";

export const initialDemoState = (): DemoState => ({
	audioUrl: null,
	draft: "",
	line: "",
	micOff: false,
	mode: null,
	phase: "opening",
	reply: null,
	resources: [],
	voice: DEFAULT_VOICE,
});

/** The server's codes, by what the person sees. */
const REFUSALS = new Map<string | undefined, Refusal>([
	["demo_expired", "expired"],
	["demo_used", "used"],
	["turn_taken", "used"],
]);

export const refusalOf = (error: unknown): Refusal =>
	REFUSALS.get(convexErrorCode(error)) ?? "error";

const refused = (reason: Refusal): DemoPhase =>
	reason === "error" ? "failed" : reason;

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
	const { phase } = state;
	switch (action.type) {
		case "OPENED":
			return phase === "opening" ? { ...state, phase: "intro" } : state;
		case "OPEN_REFUSED":
			return phase === "opening"
				? { ...state, phase: refused(action.reason) }
				: state;
		// Only before anything is said: the reply is spoken in the voice it was asked in.
		case "PICK_VOICE":
			return phase === "intro" ? { ...state, voice: action.voice } : state;
		case "TRY":
			return phase === "intro"
				? { ...state, phase: state.micOff ? "typing" : "listening" }
				: state;
		case "HEARD": {
			if (phase !== "listening") {
				return state;
			}
			const line = action.transcript.trim().slice(0, LINE_MAX_CHARS).trim();
			return line
				? { ...state, line, mode: "voice", phase: "thinking" }
				: { ...state, phase: "intro" };
		}
		case "MIC_FAILED":
			return phase === "listening"
				? { ...state, micOff: true, phase: "typing" }
				: state;
		case "DRAFT":
			return phase === "typing"
				? { ...state, draft: action.text.slice(0, LINE_MAX_CHARS) }
				: state;
		case "SEND": {
			const line = state.draft.trim();
			return phase === "typing" && line
				? { ...state, line, mode: "type", phase: "thinking" }
				: state;
		}
		case "BACK":
			return phase === "typing" ? { ...state, phase: "intro" } : state;
		case "REPLIED": {
			if (phase !== "thinking") {
				return state;
			}
			const { reply } = action;
			return reply.route === "safety"
				? { ...state, phase: "safety", resources: reply.resources }
				: {
						...state,
						audioUrl: reply.audioUrl,
						phase: "reply",
						reply: reply.text,
					};
		}
		case "REPLY_REFUSED":
			return phase === "thinking"
				? { ...state, phase: refused(action.reason) }
				: state;
		case "SAID":
			return phase === "reply" ? { ...state, phase: "done" } : state;
		default:
			return state;
	}
}

/** How a demo finished, for `intake_talk_demo_finished`: its one turn is over once the reply
 * arrives, whether or not it is heard out. Null while it isn't. */
export function finishedBy(state: DemoState): "reply" | "safety" | null {
	switch (state.phase) {
		case "reply":
		case "done":
			return "reply";
		case "safety":
			return "safety";
		default:
			return null;
	}
}
