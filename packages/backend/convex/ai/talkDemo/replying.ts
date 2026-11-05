/**
 * The Talk demo's one turn (#714): the safeguard's verdict, then Flux's
 * question. Pure but for the two calls it is handed, so it is tested with
 * both stubbed (`talkDemo/demo.test.ts`); `reply.ts` wires the real ones.
 */
import { type Infer, v } from "convex/values";
import { resourceValidator } from "../../lib/validators";
import { providerName } from "../../talk/check";
import type { SafetyVerdict } from "../intake/reading";
import { stripAudioTags } from "../talk/audioTags";
import { buildDemoPrompt, type DemoPrompt } from "./prompt";

export type DemoDeps = {
	/** The safeguard over the person's line. Never rejects. */
	checkSafety: (text: string) => Promise<SafetyVerdict>;
	/** The writer model's raw text for this prompt. May reject. */
	writeQuestion: (prompt: DemoPrompt) => Promise<string>;
};

/** The action's return: crisis support, or Flux's question (and its audio, when it was made). */
export const demoReplyValidator = v.union(
	v.object({
		resources: v.array(resourceValidator),
		route: v.literal("safety"),
		safeguardLevel: v.union(v.literal("elevated"), v.literal("crisis")),
	}),
	v.object({
		audioUrl: v.union(v.string(), v.null()),
		route: v.literal("reply"),
		text: v.string(),
	})
);

export type DemoReply = Infer<typeof demoReplyValidator>;
export type DemoTurn =
	| Extract<DemoReply, { route: "safety" }>
	| { route: "reply"; text: string };

/** Asked when the writer fails, or its reply names the feeling or isn't one question. */
export const FALLBACK_QUESTION =
	"Before we put a name on it: what part of that is still with you right now?";

/** Said aloud in one breath; the prompt asks for under 200. */
const MAX_REPLY_CHARS = 240;

/**
 * A name for the feeling: the one thing the demo's reply must not give. A
 * miss here is only a softer demo; a false hit costs a plainer question.
 */
const LABELS =
	/\b(guilt|guilty|shame|ashamed|anxi(ety|ous)|depress\w*|grie(f|ving)|resent\w*|burn(ed|t)?[ -]?out|jealous\w*|envy|envious|lonel\w*|anger|angry|sad(ness)?|fear(ful)?|afraid|scared|frustrat\w*|overwhelm\w*|betray\w*|humiliat\w*|embarrass\w*|rejection|insecur\w*|panic\w*|sounds like you|you('re| are) feeling)\b/i;

/** Quotation marks the writer wrapped its reply in. */
const WRAPPING_QUOTES = /^["'“”‘’]+|["'“”‘’]+$/g;
const RUNS_OF_SPACE = /\s+/g;

/** The writer's reply, if it holds: one question, no label, no provider name, short. */
export function cleanQuestion(raw: string): string | null {
	const text = stripAudioTags(raw)
		.replace(WRAPPING_QUOTES, "")
		.replace(RUNS_OF_SPACE, " ")
		.trim();
	const questions = text.split("?").length - 1;
	if (
		!text.endsWith("?") ||
		questions !== 1 ||
		text.length > MAX_REPLY_CHARS ||
		LABELS.test(text) ||
		providerName(text)
	) {
		return null;
	}
	return text;
}

/**
 * Safeguard first: an elevated or crisis verdict ends the demo on support,
 * whatever the writer said. The two calls run side by side for the wait's
 * sake; the writer's text is only looked at once the line is cleared.
 */
export async function replyToLine(
	line: string,
	deps: DemoDeps
): Promise<DemoTurn> {
	const writer = deps.writeQuestion(buildDemoPrompt(line));
	// Settled here so a veto never leaves the writer's rejection unhandled.
	writer.catch(() => undefined);

	const safety = await deps.checkSafety(line);
	if (safety.level === "elevated" || safety.level === "crisis") {
		return {
			resources: safety.resources,
			route: "safety",
			safeguardLevel: safety.level,
		};
	}
	const raw = await writer.catch((err: unknown) => {
		console.error("[talkDemo] writer failed", err);
		return "";
	});
	return { route: "reply", text: cleanQuestion(raw) ?? FALLBACK_QUESTION };
}
