/**
 * The request half of the Custom LLM relay (#591): ElevenLabs' OpenAI chat
 * completions request in, Anthropic Messages request out. Pure; the
 * response half is openaiSse.ts.
 */

type OpenAIContent = string | null | { type: string; text?: string }[];

export interface OpenAIToolCall {
  id: string;
  type?: string;
  function: { name: string; arguments?: string };
}

export interface OpenAIMessage {
  role: string;
  content?: OpenAIContent;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAITool {
  type?: string;
  function?: { name: string; description?: string; parameters?: Record<string, unknown> };
}

export type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface AnthropicTurn {
  role: "user" | "assistant";
  content: string | AnthropicBlock[];
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: { type: "object"; [key: string]: unknown };
}

// Anthropic wants the person to speak first; the agent's firstMessage
// arrives as a leading assistant turn.
const OPENER = "(The talk begins.)";
// ElevenLabs' system tools (end_call) end the talk rather than report back.
const UNREPORTED_RESULT = "ok";

export function textOf(content: OpenAIContent | undefined): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((p) => (p.type === "text" ? (p.text ?? "") : "")).join("");
}

function parseArgs(raw: string | undefined): unknown {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const blocksOf = (c: AnthropicTurn["content"]): AnthropicBlock[] =>
  typeof c === "string" ? [{ type: "text", text: c }] : c;

/** Same-role neighbours merge; pure text stays a plain string. */
function append(turns: AnthropicTurn[], role: AnthropicTurn["role"], blocks: AnthropicBlock[]) {
  if (blocks.length === 0) return;
  const onlyText = blocks.length === 1 && blocks[0].type === "text" ? blocks[0].text : null;
  const last = turns[turns.length - 1];
  if (last?.role !== role) {
    turns.push({ role, content: onlyText ?? blocks });
  } else if (typeof last.content === "string" && onlyText !== null) {
    last.content += `\n\n${onlyText}`;
  } else {
    last.content = [...blocksOf(last.content), ...blocks];
  }
}

/** Every tool_use must be answered at the start of the next user turn. */
function answerToolCalls(turns: AnthropicTurn[]) {
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (turn.role !== "assistant" || typeof turn.content === "string") continue;
    const ids = turn.content.flatMap((b) => (b.type === "tool_use" ? [b.id] : []));
    if (ids.length === 0) continue;
    let next = turns[i + 1];
    if (next?.role !== "user") {
      next = { role: "user", content: [] };
      turns.splice(i + 1, 0, next);
    }
    const blocks = blocksOf(next.content);
    const answered = new Set(blocks.flatMap((b) => (b.type === "tool_result" ? [b.tool_use_id] : [])));
    const missing: AnthropicBlock[] = ids
      .filter((id) => !answered.has(id))
      .map((id) => ({ type: "tool_result", tool_use_id: id, content: UNREPORTED_RESULT }));
    next.content = [...missing, ...blocks];
  }
}

/**
 * Split an OpenAI request into Anthropic's `system`, alternating turns and
 * tools. System messages join into `system`; tool calls and results become
 * tool_use / tool_result blocks (the agent's `end_call` is one).
 */
export function toAnthropicRequest(
  messages: OpenAIMessage[],
  tools: OpenAITool[] = [],
): { system: string; messages: AnthropicTurn[]; tools: AnthropicTool[] } {
  const system: string[] = [];
  const turns: AnthropicTurn[] = [];
  for (const m of messages) {
    const text = textOf(m.content).trim();
    if (m.role === "system" || m.role === "developer") {
      if (text) system.push(text);
    } else if (m.role === "user") {
      if (text) append(turns, "user", [{ type: "text", text }]);
    } else if (m.role === "assistant") {
      append(turns, "assistant", [
        ...(text ? [{ type: "text" as const, text }] : []),
        ...(m.tool_calls ?? []).map((c) => ({
          type: "tool_use" as const,
          id: c.id,
          name: c.function.name,
          input: parseArgs(c.function.arguments),
        })),
      ]);
    } else if (m.role === "tool" && m.tool_call_id) {
      append(turns, "user", [{ type: "tool_result", tool_use_id: m.tool_call_id, content: text || UNREPORTED_RESULT }]);
    }
  }
  answerToolCalls(turns);
  if (turns[0]?.role === "assistant") turns.unshift({ role: "user", content: OPENER });
  return {
    system: system.join("\n\n"),
    messages: turns,
    tools: tools.flatMap((t) =>
      t.function
        ? [{ name: t.function.name, description: t.function.description, input_schema: { type: "object" as const, ...t.function.parameters } }]
        : [],
    ),
  };
}
