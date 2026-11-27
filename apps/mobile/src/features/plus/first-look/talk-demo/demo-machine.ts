import type { api } from "@xolace/backend/convex/_generated/api";
import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { TALK_DEMO_LINE_MAX_CHARS } from "@xolace/backend/shared";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { convexErrorCode } from "@/lib/convex-error-code";

export type DemoReply = FunctionReturnType<typeof api.ai.talkDemo.reply.reply>;
type SafetyResource = Extract<
	DemoReply,
	{ route: "safety" }
>["resources"][number];

export type DemoPhase =
	| "opening"
	| "intro"
	| "listening"
	| "typing"
	| "thinking"
	| "reply"
	| "done"
	| "safety"
	| "used"
	| "expired"
	| "failed";

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
	| { type: "OPENED_ON_SAFETY"; resources: readonly SafetyResource[] }
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

const REFUSALS = new Map<string | undefined, Refusal>([
	["demo_expired", "expired"],
	["demo_used", "used"],
	["turn_taken", "used"],
]);

export const refusalOf = (error: unknown): Refusal =>
	REFUSALS.get(convexErrorCode(error)) ?? "error";

const isResource = (value: unknown): value is SafetyResource =>
	typeof value === "object" &&
	value !== null &&
	"label" in value &&
	"priority" in value &&
	"source" in value &&
	"type" in value &&
	"value" in value;

const resourcesOf = (error: unknown): readonly SafetyResource[] => {
	const data: unknown = error instanceof ConvexError ? error.data : null;
	if (
		typeof data !== "object" ||
		data === null ||
		!("resources" in data) ||
		!Array.isArray(data.resources)
	) {
		return [];
	}
	return data.resources.filter(isResource);
};

export const isSettling = (error: unknown) =>
	convexErrorCode(error) === "demo_settling";

export const openRefused = (error: unknown): DemoAction =>
	convexErrorCode(error) === "demo_safety"
		? { resources: resourcesOf(error), type: "OPENED_ON_SAFETY" }
		: { reason: refusalOf(error), type: "OPEN_REFUSED" };

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
		case "OPENED_ON_SAFETY":
			return phase === "opening"
				? { ...state, phase: "safety", resources: action.resources }
				: state;
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
			const line = action.transcript
				.trim()
				.slice(0, TALK_DEMO_LINE_MAX_CHARS)
				.trim();
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
				? { ...state, draft: action.text.slice(0, TALK_DEMO_LINE_MAX_CHARS) }
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

export function finishedBy(state: DemoState): "reply" | "safety" | null {
	switch (state.phase) {
		case "reply":
		case "done":
			return "reply";
		case "safety":
			return state.mode ? "safety" : null;
		default:
			return null;
	}
}
