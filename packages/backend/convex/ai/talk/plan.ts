/**
 * What one talk turn says and under which system prompt, from what the
 * endpoint read. Pure: chatCompletions.ts serves it, and the talk eval
 * (#605) plays the same assembly against the model.
 */
import type { FunctionReturnType } from "convex/server";
import type { internal } from "../../_generated/api";
import { type TalkClock, talkCue } from "../../talk/clock";
import { talkSystem } from "../../talk/memory";
import { raises } from "../../talk/safety";
import { safetySkill } from "../../talk/safetyScript";
import {
	COMPANION_FALLBACK_NAME,
	companionPrompt,
	type TalkStyle,
} from "../prompts/companion";
import type { TalkPeak } from "../safeguard";
import type { AnthropicTurn } from "./openaiCompat";

/** `remember.forTurn`'s read: the preload, the recall, safety and who's talking. */
export type TurnMemory = NonNullable<
	FunctionReturnType<typeof internal.talk.remember.forTurn>
>;

export function planTurn(input: {
	memory: TurnMemory | null;
	/** This turn's crisis-phrase floor. */
	phrase: TalkPeak | null;
	clock: TalkClock;
	agentSystem: string;
	turns: AnthropicTurn[];
}) {
	const { memory, phrase, clock, agentSystem, turns } = input;
	const peak =
		phrase && raises(memory?.safety, phrase) ? phrase : memory?.safety;
	// Who the companion is leads the cached prefix (#601), with what it calls
	// the person (#602).
	const name = memory?.name ?? COMPANION_FALLBACK_NAME;
	// Same clock at crisis (no extension, #581); only where its cues point changes.
	const cue = talkCue(clock, peak?.level === "crisis");
	// Directness and a mid-talk "slow down" ride the same prompt (#603).
	const systemAs = (
		n: string,
		person = memory?.person,
		style: TalkStyle | undefined = memory?.style
	) =>
		talkSystem(
			[companionPrompt(n, person, style), agentSystem]
				.filter(Boolean)
				.join("\n\n"),
			memory,
			turns,
			cue,
			safetySkill(peak)
		);
	return {
		// The fixed line, said once; that turn makes no model call.
		crisisLine: peak?.level === "crisis" && !memory?.crisisLineSpoken,
		cue,
		name,
		peak,
		systemAs,
	};
}
