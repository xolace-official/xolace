import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { talkLines } from "../../talk/transcript";
import { timingSafeEqual } from "../../lib/timingSafeEqual";
import { getAnthropicClient, thinkingOff } from "../providers/anthropic";
import { toAnthropicRequest, type AnthropicTurn, type OpenAIMessage, type OpenAITool } from "./openaiCompat";
import { createEventTranslator, sseChunk, SSE_DONE, type FinishReason } from "./openaiSse";
import { talkClockOf, talkCue } from "../../talk/clock";
import { talkSystem } from "../../talk/memory";
import { moderateInput } from "../providers/moderation";
import { COMPANION_FALLBACK_NAME, RENAME_TOOL, companionPrompt, renameTool, renameTurns } from "../prompts/companion";
import { CRISIS_LINE, moderationPeak, phrasePeak, raises, safetySkill, turnWords } from "../../talk/safety";

// The agent's Custom LLM `model_id` picks one of these; anything else gets
// the first. Both are listed so the prototype can measure TTFT on each (#591).
const TALK_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"] as const;
// A spoken turn is a few sentences.
const TALK_MAX_TOKENS = 400;
// The agent's system tool that hangs up; our clock calls it on the last turn (#597).
// Emitted even if the agent doesn't list it: then nothing hangs up but the backstop.
const END_CALL = "end_call";
// How long moderation may hold the first chunk, from the turn's start (#581).
// A miss streams the turn; the verdict applies from the next one.
const MODERATION_WAIT_MS = 250;
// A late verdict is waited on this long after [DONE], then dropped.
const MODERATION_LATE_MS = 5000;

const within = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), Math.max(0, ms)))]);

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
 * Relays the agent's prompt and history, with what the companion knows of
 * the person (#598): the preload rendered at talk start rides in the cached
 * system prefix; the latest episodic recall and the clock cue ride after it.
 *
 * Our clock rules the talk's length (#597): every turn gets the time left
 * from Convex's record, and the last turn (ceiling reached, or a long
 * silence) ends on an `end_call` the endpoint emits itself. The app never
 * enforces it.
 *
 * Each turn is bound to its talk's session by the `{ sessionId, talkKey }`
 * the client set as the custom LLM extra body (#592), and the talk so far is
 * written to `talk_turns` as the turn starts: an interruption kills this
 * handler mid-stream (#591), so nothing that must land can wait for the end.
 *
 * Safety (#599): this turn's words pass a crisis-phrase floor before the
 * model, and moderation races the model, holding the first chunk up to
 * MODERATION_WAIT_MS. At crisis the companion speaks CRISIS_LINE (once per
 * talk, no model call), then the crisis safety skill for the rest of the
 * talk; at elevated, the elevated skill. Late verdicts land for the next turn.
 *
 * ponytail: the `[talk]` logs carry only timings, model and body keys (never
 * text); they answer #591's open measurements. Drop or downgrade them once
 * those are recorded.
 */
export const chatCompletions = httpAction(async (ctx, request) => {
  const startedAt = Date.now();
  const t: Record<string, number> = {};
  const mark = (k: string) => (t[k] ??= Date.now() - startedAt);
  const secret = process.env.TALK_LLM_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  // Fail closed: an unset secret must not open the endpoint.
  if (!secret || !timingSafeEqual(await sha256Hex(auth), await sha256Hex(`Bearer ${secret}`))) {
    return new Response("unauthorized", { status: 401 });
  }
  mark("auth");

  let body: { model?: string; messages?: OpenAIMessage[]; tools?: OpenAITool[]; elevenlabs_extra_body?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }
  mark("parsed");
  if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });
  const extra = (body.elevenlabs_extra_body ?? {}) as { sessionId?: unknown; talkKey?: unknown };
  if (typeof extra.sessionId !== "string" || typeof extra.talkKey !== "string") {
    return new Response("no talk", { status: 403 });
  }
  const talk = { sessionId: extra.sessionId, talkKey: extra.talkKey, lines: talkLines(body.messages) };
  const clock = talkClockOf(talk.talkKey, talk.lines, startedAt);
  if (!clock) return new Response("no talk", { status: 403 });
  const words = turnWords(talk.lines);
  const phrase = phrasePeak(words);
  // Raced against the first chunk below; never rejects (unavailable = no verdict).
  const moderation = words && !phrase ? moderateInput(words).then(moderationPeak) : null;
  // The one database read before the model call (#598): the preload is
  // fixed at talk start, the recall and the safety peak land between turns.
  const memory = await ctx.runQuery(internal.talk.remember.forTurn, talk).catch((err) => {
    console.error("[talk] memory read failed", err);
    return null;
  });
  mark("memory");
  const peak = phrase && raises(memory?.safety, phrase) ? phrase : memory?.safety;
  // The fixed line, said once (marked only once fully sent: an interrupted
  // line comes again); this turn makes no model call.
  let crisisLine = peak?.level === "crisis" && !memory?.crisisLineSpoken;
  // Started now, awaited once the model call is in flight: costs no TTFT.
  // A failed write fails closed: no turn the transcript can't hold.
  const bound = ctx
    .runMutation(internal.talk.turns.syncLines, { ...talk, ...(phrase ? { peak: phrase } : {}) })
    .catch((err) => {
      console.error("[talk] turn sync failed", err);
      return false;
    });

  const model = TALK_MODELS.find((m) => m === body.model) ?? TALK_MODELS[0];
  const { system: agentSystem, messages: turns, tools: agentTools } = toAnthropicRequest(body.messages, body.tools);
  // Who the companion is leads the cached prefix (#601); our rename tool is
  // listed beside the agent's own and answered here, never relayed.
  const name = memory?.name ?? COMPANION_FALLBACK_NAME;
  const tools = [...agentTools, renameTool];
  const cue = talkCue(clock);
  const systemAs = (n: string) =>
    talkSystem([companionPrompt(n), agentSystem].filter(Boolean).join("\n\n"), memory, turns, cue, safetySkill(peak));
  if (turns.length === 0) return new Response("no turns", { status: 400 });
  // The last turn ends on our end_call; tools stay listed (the history may
  // hold past calls) but the model can't make one of its own.
  const { closing } = cue;

  const meta = { id: `chatcmpl-${crypto.randomUUID()}`, model, created: Math.floor(startedAt / 1000) };
  const abort = new AbortController();
  let outcome: "done" | "aborted" | "error" | "unbound" = "done";
  let firstTokenAt: number | null = null;
  // Tag words only (e.g. "sigh"), never the turn's text: does #583's audio-tag
  // set make it through to ElevenLabs?
  const audioTags: string[] = [];
  let reply = "";
  const toolCalls: string[] = [];
  let usage: { input_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null } | null = null;

  const log = () =>
    console.log("[talk] turn", {
      model,
      outcome,
      ttftMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
      totalMs: Date.now() - startedAt,
      phasesMs: t,
      inputTokens: usage?.input_tokens,
      cacheRead: usage?.cache_read_input_tokens,
      cacheWrite: usage?.cache_creation_input_tokens,
      turns: turns.length,
      elapsedS: Math.round(clock.elapsedMs / 1000),
      silentTurns: clock.silentTurns,
      closing,
      safety: peak?.level ?? null,
      crisisLine,
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
        const call = (messages: AnthropicTurn[], noTools: boolean, system = systemAs(name)) =>
          getAnthropicClient().messages.stream(
          {
            model,
            max_tokens: TALK_MAX_TOKENS,
            thinking: thinkingOff(model),
            ...(system.length ? { system } : {}),
            // The agent's system tools (end_call) and our rename — the model decides to use them.
            tools,
            ...(noTools ? { tool_choice: { type: "none" as const } } : {}),
            messages,
            // From eu-west-1, "us" cut Haiku's median TTFT by 140–290 ms over
            // "global" in three A/Bs; Sonnet within noise (#591).
            inference_geo: "us",
          },
          // One attempt: a retried turn would land long after the person stopped waiting.
          { signal: abort.signal, maxRetries: 0 },
        );
        const anthropic = crisisLine ? null : call(turns, closing);
        mark("streamCalled");
        anthropic?.on("connect", () => mark("headers"));
        // We abort it ourselves (unbound, or a crisis caught in time); not an error.
        anthropic?.on("abort", () => {});
        // Not this talk's turn (wrong key, or the talk has closed): serve nothing.
        // The clock read from the key is trusted only past this check.
        if (!(await bound)) {
          outcome = "unbound";
          abort.abort();
          send(sseChunk(meta, {}, "stop"));
          send(SSE_DONE);
          controller.close();
          return;
        }
        mark("bound");
        // Moderation holds the first chunk: a crisis caught in time is met this turn.
        let early: Awaited<NonNullable<typeof moderation>> = null;
        if (anthropic && moderation && !crisisLine) {
          early = await within(moderation, MODERATION_WAIT_MS - (Date.now() - startedAt));
          mark("moderated");
          if (early?.level === "crisis") {
            crisisLine = !memory?.crisisLineSpoken;
            if (crisisLine) abort.abort();
            // Help on screen before anything is said.
            await ctx.runMutation(internal.talk.safety.raise, { sessionId: talk.sessionId, peak: early });
          }
        }
        send(sseChunk(meta, { role: "assistant" }));
        let finish: FinishReason = "stop";
        if (crisisLine) {
          firstTokenAt = Date.now();
          send(sseChunk(meta, { content: CRISIS_LINE }));
          reply = CRISIS_LINE;
        }
        // Relays one model call; a rename call is held back and returned.
        const relay = async (events: NonNullable<typeof anthropic>) => {
          const translate = createEventTranslator();
          let text = "";
          let rename: { index: number; id: string; json: string } | null = null;
          for await (const event of events) {
            if (event.type === "message_start") usage ??= event.message.usage;
            if (event.type === "content_block_start" && event.content_block.type === "tool_use" && event.content_block.name === RENAME_TOOL) {
              rename = { index: event.index, id: event.content_block.id, json: "" };
              continue;
            }
            if (rename && event.type === "content_block_delta" && event.index === rename.index) {
              if (event.delta.type === "input_json_delta") rename.json += event.delta.partial_json;
              continue;
            }
            const out = translate(event);
            if (!out) continue;
            if ("finish" in out) {
              finish = out.finish;
              continue;
            }
            firstTokenAt ??= Date.now();
            mark("firstDelta");
            send(sseChunk(meta, out.delta));
            text += out.delta.content ?? "";
            for (const call of out.delta.tool_calls ?? []) if (call.function.name) toolCalls.push(call.function.name);
          }
          reply += text;
          return { text, rename };
        };
        const first = crisisLine || !anthropic ? null : await relay(anthropic);
        // A rename (#601): saved, then one more call to confirm or decline it
        // aloud. Skipped if the turn also relayed a tool call: the agent
        // already holds that turn.
        if (first?.rename) {
          toolCalls.push(RENAME_TOOL);
          let input: { name?: unknown } = {};
          try {
            input = JSON.parse(first.rename.json || "{}");
          } catch {}
          const result = await ctx.runMutation(internal.talk.companion.rename, {
            sessionId: talk.sessionId,
            talkKey: talk.talkKey,
            name: typeof input.name === "string" ? input.name : "",
          });
          if ((finish as FinishReason) === "tool_calls" && toolCalls.length === 1) {
            finish = "stop";
            // The confirmation already speaks as the new name.
            const as = systemAs(result.ok ? result.name : name);
            await relay(call([...turns, ...renameTurns(first.text, first.rename.id, input, result, name)], true, as));
          }
        }
        // Never hang up on the crisis line (#581).
        if (closing && !crisisLine) {
          const call = { index: 0, id: `call_${crypto.randomUUID()}`, type: "function" as const };
          send(sseChunk(meta, { tool_calls: [{ ...call, function: { name: END_CALL, arguments: '{"reason":"talk ended"}' } }] }));
          toolCalls.push(END_CALL);
          finish = "tool_calls";
        }
        send(sseChunk(meta, {}, finish));
        send(SSE_DONE);
        // After [DONE]: the agent already has its turn.
        await ctx.runMutation(internal.talk.turns.syncLines, {
          sessionId: talk.sessionId,
          talkKey: talk.talkKey,
          reply: { seq: talk.lines.length, text: reply },
        });
        // A verdict that missed the race applies from the next turn.
        const late = early ?? (moderation ? await within(moderation, MODERATION_LATE_MS) : null);
        if (late || crisisLine) {
          await ctx.runMutation(internal.talk.safety.raise, {
            sessionId: talk.sessionId,
            ...(late ? { peak: late } : {}),
            ...(crisisLine ? { crisisLineSpoken: true } : {}),
          });
        }
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
