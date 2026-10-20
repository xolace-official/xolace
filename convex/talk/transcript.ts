import { textOf, type OpenAIMessage } from "../ai/talk/openaiCompat";

export type TalkLine = { role: "person" | "companion"; text: string };

// A talk's own cap on the mirror input (#592): a 15-min talk plus a 5-min
// "Say more" runs well past the typed 5,000. Generous; the talk ceiling is
// the real bound.
export const MAX_TALK_INPUT = 20_000;

/**
 * The talk as ElevenLabs resends it every turn: both sides' spoken text in
 * order. The agent's prompt, tool calls and tool results are not the talk.
 */
export function talkLines(messages: OpenAIMessage[]): TalkLine[] {
  const lines: TalkLine[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const text = textOf(m.content).trim();
    if (text) lines.push({ role: m.role === "user" ? "person" : "companion", text });
  }
  return lines;
}

/** The mirror's input: the person's lines only, keeping the end past the cap. */
export function personText(lines: TalkLine[]): string {
  const text = lines
    .filter((l) => l.role === "person")
    .map((l) => l.text)
    .join("\n")
    .trim();
  return text.length > MAX_TALK_INPUT ? text.slice(-MAX_TALK_INPUT) : text;
}
