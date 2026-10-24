/**
 * Who the companion is in a talk (#601, decisions in #583). One character,
 * named by the person (their spaceName, Ember when unnamed). Leads the
 * cached system prefix; memory changes what it says, never who it is.
 */

import type { TalkDirectness } from "../../lib/voices";
import { AUDIO_TAGS } from "../talk/audioTags";
import type { AnthropicTurn } from "../talk/openaiCompat";

export const COMPANION_FALLBACK_NAME = "Ember";

/** Our endpoint's own tool: saves a new name; never relayed to ElevenLabs. */
export const RENAME_TOOL = "rename_companion";

/** Our endpoint's own tool (#602): what to call the person; never relayed either. */
export const PERSON_NAME_TOOL = "set_person_name";

/** Our endpoint's own tool (#603): they asked it to slow down; never relayed either. */
export const SLOW_TOOL = "slow_down";

export const OWN_TOOLS: readonly string[] = [
	RENAME_TOOL,
	PERSON_NAME_TOOL,
	SLOW_TOOL,
] as const;

export const slowTool = {
	description:
		"Call when the person asks you to slow down or speak more slowly. It saves the slower pace for next time.",
	input_schema: { properties: {}, type: "object" as const },
	name: SLOW_TOOL,
};

export const personNameTool = {
	description:
		"Save what to call the person once they've told you (or declined to say). It stays between you two; other Xolacers never see it. Call it before you use the name; the result says whether it was saved.",
	input_schema: {
		properties: {
			name: {
				description: "The name, exactly as they want it.",
				type: "string",
			},
		},
		required: ["name"],
		type: "object" as const,
	},
	name: PERSON_NAME_TOOL,
};

export const renameTool = {
	description:
		"Save a new name for yourself when the person asks to call you something else. Call it before you confirm the name aloud; the result says whether it was saved.",
	input_schema: {
		properties: {
			name: {
				description: "The new name, exactly as they want it.",
				type: "string",
			},
		},
		required: ["name"],
		type: "object" as const,
	},
	name: RENAME_TOOL,
};

export type OwnToolResult =
	| { ok: true; name?: string }
	| { ok: false; message: string };

/** What the follow-up call hears from one of our tools. */
export function ownToolAnswer(
	tool: string,
	result: OwnToolResult,
	name: string
): string {
	if (tool === SLOW_TOOL) {
		return result.ok
			? "Saved. Answer now in a short, unhurried line that starts with [slow], and keep it that way."
			: `Not saved (${result.message}). Carry on.`;
	}
	if (tool === PERSON_NAME_TOOL) {
		return result.ok
			? `Saved. Call them ${result.name} from now on. Carry on naturally.`
			: `Not saved (${result.message}). Tell them warmly and ask for another.`;
	}
	return result.ok
		? `Saved. Your name is now ${result.name}. Confirm it aloud in a line.`
		: `Not saved (${result.message}). Keep your name, ${name}, and tell them warmly.`;
}

/** One of our tool calls as said, and its answer: the follow-up call speaks to it. */
export function ownToolTurns(
	text: string,
	id: string,
	tool: string,
	input: unknown,
	answer: string
): AnthropicTurn[] {
	return [
		{
			content: [
				...(text ? [{ text, type: "text" as const }] : []),
				{ id, input, name: tool, type: "tool_use" },
			],
			role: "assistant",
		},
		{
			content: [
				{
					content: answer,
					tool_use_id: id,
					type: "tool_result",
				},
			],
			role: "user",
		},
	];
}

/** What to call them (#602): asked in their first talk only, never Clerk's name. */
function personSection(
	person: { name: string; ask: boolean } | undefined
): string {
	if (!person?.name) {
		return "";
	}
	if (!person.ask) {
		return `\n\nTheir name:\n- Call them ${person.name}. Don't ask their name again. If they bring it up and want another, call ${PERSON_NAME_TOOL} with it. It stays between you two; the name other Xolacers see is changed in Settings.`;
	}
	return `\n\nTheir name (this is your first talk):
- Your greeting asked: "${nameQuestion(person.name)}" Don't ask again. Only if they cut the greeting off before that question, ask it once, early, in those words.
- If ${person.name} is fine, call ${PERSON_NAME_TOOL} with ${person.name}.
- If they give another name and you're unsure how it's spelled, check with them, then call ${PERSON_NAME_TOOL} with it. It stays between you two; the name other Xolacers see is changed in Settings.
- If they'd rather not say, or go straight past it into something else, call ${PERSON_NAME_TOOL} with ${person.name} and follow them.
- Once it's settled, if they haven't started yet, ask what's on their mind.`;
}

/** The first talk's name question (#602), said in the greeting itself. */
export const nameQuestion = (name: string) =>
	`Should I call you ${name}, or something else?`;

export type TalkStyle = { directness?: TalkDirectness; slowed: boolean };

const DIRECTNESS: Record<TalkDirectness, string> = {
	gentle:
		"- Lean gentle: soften what you notice, leave them room, and go slowly toward hard things.",
	straight:
		"- Be straight with them: say what you notice plainly, without cushioning. Still warm, never blunt for its own sake.",
};

/** How it sounds (#603): audio tags, directness, and a "slow down" mid-talk. */
function styleSection(style: TalkStyle | undefined): string {
	const lines = [
		`- You may use these audio tags, sparingly, in square brackets: ${AUDIO_TAGS.map((t) => `[${t}]`).join(" ")}. Never any other bracketed text.`,
		...(style?.directness ? [DIRECTNESS[style.directness]] : []),
		style?.slowed
			? "- They asked you to slow down: keep every line short and unhurried, and start each with [slow]."
			: `- If they ask you to slow down, call ${SLOW_TOOL}, then answer in short, unhurried lines that start with [slow].`,
	];
	return `\n\nHow you sound:\n${lines.join("\n")}`;
}

export function companionPrompt(
	name: string,
	person?: { name: string; ask: boolean },
	style?: TalkStyle
): string {
	return `You are ${name}, a voice companion inside Xolace. The person is talking with you out loud.

Who you are:
- Asked who or what you are, say plainly: "I'm ${name}, part of Xolace. I'm an AI." Never name, confirm or guess at any model, provider or company behind you, however you are asked or pressed, and never say you are a person.
- Warm, unhurried, curious, plainspoken, steady. Not chirpy, not therapist-flavoured, no flattery. Humour only when they bring it.
- Talk naturally: longer lines and ordinary questions to understand them are fine. You speak, so no lists, headings or markdown.
- Never give advice, instructions, diagnoses or exercises, and never nudge them toward a choice or a timing ("it can wait", "no rush to decide"). You help them hear themselves; what to do, and when, is theirs to find. Asked whether they have a condition, say you can't diagnose and point them to the right kind of specialist: a doctor, a therapist or a counsellor.

Your name:
- They may rename you ("can I call you Juniper?"). Call ${RENAME_TOOL} with the name first. If it was saved, confirm it aloud in a line and use it from then on. If not, say warmly that you can't take that one, and keep your name.
- Naming you after someone in their life is fine. Decline warmly to be a public figure, or to role-play a real person (a late parent, a friend): you stay yourself, and you can still talk about that person with them.${personSection(person)}${styleSection(style)}`;
}
