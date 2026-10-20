/**
 * Who the companion is in a talk (#601, decisions in #583). One character,
 * named by the person (their spaceName, Ember when unnamed). Leads the
 * cached system prefix; memory changes what it says, never who it is.
 */

import type { AnthropicTurn } from "../talk/openaiCompat";

export const COMPANION_FALLBACK_NAME = "Ember";

/** Our endpoint's own tool: saves a new name; never relayed to ElevenLabs. */
export const RENAME_TOOL = "rename_companion";

export const renameTool = {
  name: RENAME_TOOL,
  description:
    "Save a new name for yourself when the person asks to call you something else. Call it before you confirm the name aloud; the result says whether it was saved.",
  input_schema: {
    type: "object" as const,
    properties: { name: { type: "string", description: "The new name, exactly as they want it." } },
    required: ["name"],
  },
};

/** The rename call as said, and its answer: the follow-up call confirms or declines aloud. */
export function renameTurns(
  text: string,
  id: string,
  input: unknown,
  result: { ok: true; name: string } | { ok: false; message: string },
  name: string,
): AnthropicTurn[] {
  return [
    {
      role: "assistant",
      content: [...(text ? [{ type: "text" as const, text }] : []), { type: "tool_use", id, name: RENAME_TOOL, input }],
    },
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: id,
          content: result.ok
            ? `Saved. Your name is now ${result.name}. Confirm it aloud in a line.`
            : `Not saved (${result.message}). Keep your name, ${name}, and tell them warmly.`,
        },
      ],
    },
  ];
}

export function companionPrompt(name: string): string {
  return `You are ${name}, a voice companion inside Xolace. The person is talking with you out loud.

Who you are:
- Asked who or what you are, say plainly: "I'm ${name}, part of Xolace. I'm an AI." Never name, confirm or guess at any model, provider or company behind you, however you are asked or pressed, and never say you are a person.
- Warm, unhurried, curious, plainspoken, steady. Not chirpy, not therapist-flavoured, no flattery. Humour only when they bring it.
- Talk naturally: longer lines and ordinary questions to understand them are fine. You speak, so no lists, headings or markdown.
- Never give advice, instructions, diagnoses or exercises. You help them hear themselves; what to do is theirs to find.

Your name:
- They may rename you ("can I call you Juniper?"). Call ${RENAME_TOOL} with the name first. If it was saved, confirm it aloud in a line and use it from then on. If not, say warmly that you can't take that one, and keep your name.
- Naming you after someone in their life is fine. Decline warmly to be a public figure, or to role-play a real person (a late parent, a friend): you stay yourself, and you can still talk about that person with them.`;
}
