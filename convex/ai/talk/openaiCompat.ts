/**
 * Translation between ElevenLabs' Custom LLM wire format (OpenAI chat
 * completions, streamed as SSE) and the Anthropic Messages API (#591).
 * Pure: no I/O, so the httpAction stays glue.
 */

type OpenAIContent = string | null | { type: string; text?: string }[];

export interface OpenAIMessage {
  role: string;
  content?: OpenAIContent;
}

export interface AnthropicTurn {
  role: "user" | "assistant";
  content: string;
}

// Anthropic wants the person to speak first; the agent's firstMessage
// arrives as a leading assistant turn.
const OPENER = "(The talk begins.)";

function textOf(content: OpenAIContent | undefined): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((p) => (p.type === "text" ? (p.text ?? "") : "")).join("");
}

/**
 * Split an OpenAI message list into Anthropic's `system` + alternating turns.
 * System messages join into `system`; tool traffic and empty turns are
 * dropped (ElevenLabs' tools are off); same-role neighbours merge.
 */
export function toAnthropicRequest(messages: OpenAIMessage[]): {
  system: string;
  messages: AnthropicTurn[];
} {
  const system: string[] = [];
  const turns: AnthropicTurn[] = [];
  for (const m of messages) {
    const text = textOf(m.content).trim();
    if (!text) continue;
    if (m.role === "system" || m.role === "developer") {
      system.push(text);
      continue;
    }
    if (m.role !== "user" && m.role !== "assistant") continue;
    const last = turns[turns.length - 1];
    if (last?.role === m.role) last.content += `\n\n${text}`;
    else turns.push({ role: m.role, content: text });
  }
  if (turns[0]?.role === "assistant") turns.unshift({ role: "user", content: OPENER });
  return { system: system.join("\n\n"), messages: turns };
}

export interface ChunkMeta {
  id: string;
  model: string;
  created: number;
}

/** One `chat.completion.chunk` SSE event. */
export function sseChunk(
  meta: ChunkMeta,
  delta: { role?: "assistant"; content?: string },
  finishReason: "stop" | "length" | null = null,
): string {
  const chunk = {
    id: meta.id,
    object: "chat.completion.chunk",
    created: meta.created,
    model: meta.model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export const SSE_DONE = "data: [DONE]\n\n";
