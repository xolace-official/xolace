import { httpAction } from "../../_generated/server";
import { timingSafeEqual } from "../../lib/timingSafeEqual";
import { getAnthropicClient, thinkingOff } from "../providers/anthropic";
import { toAnthropicRequest, type OpenAIMessage, type OpenAITool } from "./openaiCompat";
import { createEventTranslator, sseChunk, SSE_DONE, type FinishReason } from "./openaiSse";

// The agent's Custom LLM `model_id` picks one of these; anything else gets
// the first. Both are listed so the prototype can measure TTFT on each (#591).
const TALK_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"] as const;
// A spoken turn is a few sentences.
const TALK_MAX_TOKENS = 400;

// Digests first so the compare is fixed-length and leaks nothing of the secret.
async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ElevenLabs Custom LLM endpoint: `POST /v1/chat/completions`, answered as
 * OpenAI `chat.completion.chunk` SSE ending in `[DONE]`, relayed from the
 * Anthropic stream (#578, #579). The agent sends the shared secret as its
 * Custom LLM api_key, i.e. `Authorization: Bearer <TALK_LLM_SECRET>`.
 *
 * Prototype brain: relays whatever the agent sends (its prompt + history).
 * Safeguard, memory and the talk ledger land in later tickets.
 *
 * ponytail: the `[talk]` logs carry only timings, model and body keys (never
 * text); they answer #591's open measurements. Drop or downgrade them once
 * those are recorded.
 */
export const chatCompletions = httpAction(async (_ctx, request) => {
  const startedAt = Date.now();
  const secret = process.env.TALK_LLM_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  // Fail closed: an unset secret must not open the endpoint.
  if (!secret || !timingSafeEqual(await sha256Hex(auth), await sha256Hex(`Bearer ${secret}`))) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: { model?: string; messages?: OpenAIMessage[]; tools?: OpenAITool[]; elevenlabs_extra_body?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });

  const model = TALK_MODELS.find((m) => m === body.model) ?? TALK_MODELS[0];
  const { system, messages: turns, tools } = toAnthropicRequest(body.messages, body.tools);
  if (turns.length === 0) return new Response("no turns", { status: 400 });

  const meta = { id: `chatcmpl-${crypto.randomUUID()}`, model, created: Math.floor(startedAt / 1000) };
  const abort = new AbortController();
  let outcome: "done" | "aborted" | "error" = "done";
  let firstTokenAt: number | null = null;
  // Tag words only (e.g. "sigh"), never the turn's text: does #583's audio-tag
  // set make it through to ElevenLabs?
  const audioTags: string[] = [];
  let reply = "";
  const toolCalls: string[] = [];

  const log = () =>
    console.log("[talk] turn", {
      model,
      outcome,
      ttftMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
      totalMs: Date.now() - startedAt,
      turns: turns.length,
      bodyKeys: Object.keys(body),
      audioTags,
      toolCalls,
      extraBodyKeys:
        body.elevenlabs_extra_body && typeof body.elevenlabs_extra_body === "object"
          ? Object.keys(body.elevenlabs_extra_body)
          : null,
    });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));
      try {
        const anthropic = getAnthropicClient().messages.stream(
          {
            model,
            max_tokens: TALK_MAX_TOKENS,
            thinking: thinkingOff(model),
            ...(system ? { system } : {}),
            // The agent's system tools (end_call) — the model decides to use them.
            ...(tools.length ? { tools } : {}),
            messages: turns,
          },
          // One attempt: a retried turn would land long after the person stopped waiting.
          { signal: abort.signal, maxRetries: 0 },
        );
        send(sseChunk(meta, { role: "assistant" }));
        const translate = createEventTranslator();
        let finish: FinishReason = "stop";
        for await (const event of anthropic) {
          const out = translate(event);
          if (!out) continue;
          if ("finish" in out) {
            finish = out.finish;
            continue;
          }
          firstTokenAt ??= Date.now();
          send(sseChunk(meta, out.delta));
          reply += out.delta.content ?? "";
          for (const call of out.delta.tool_calls ?? []) if (call.function.name) toolCalls.push(call.function.name);
        }
        send(sseChunk(meta, {}, finish));
        send(SSE_DONE);
        controller.close();
      } catch (err) {
        if (outcome !== "aborted") {
          outcome = "error";
          console.error("[talk] stream failed", err);
          // End the SSE cleanly so the agent sees a finished (short) turn,
          // not a torn stream.
          send(sseChunk(meta, {}, "stop"));
          send(SSE_DONE);
          controller.close();
        }
      } finally {
        for (const m of reply.matchAll(/\[([a-z][a-z ]{0,30})\]/gi)) audioTags.push(m[1]);
        log();
      }
    },
    // ElevenLabs hung up — an interruption, or the talk ended mid-turn.
    cancel() {
      outcome = "aborted";
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    },
  });
});
