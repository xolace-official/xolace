import { internal } from "../../_generated/api";
import { httpAction } from "../../_generated/server";
import { moderationPeak, phrasePeak, turnWords } from "../../talk/safety";
import { CRISIS_LINE } from "../../talk/safetyScript";
import {
	ownToolAnswer,
	ownToolTurns,
	PERSON_NAME_TOOL,
	personNameTool,
	renameTool,
	SLOW_TOOL,
	slowTool,
} from "../prompts/companion";
import { moderateInput } from "../providers/moderation";
import { stripAudioTags } from "./audioTags";
import { toAnthropicRequest } from "./openaiCompat";
import {
	type FinishReason,
	type OpenAIDelta,
	SSE_DONE,
	sseChunk,
} from "./openaiSse";
import { planTurn } from "./plan";
import {
	companionVersion,
	type RelaySink,
	readTurn,
	relayTurn,
	runOwnTool,
	streamTurn,
	talkModel,
} from "./turn";

// The agent's system tool that hangs up; our clock calls it on the last turn (#597).
// Emitted even if the agent doesn't list it: then nothing hangs up but the backstop.
const END_CALL = "end_call";
// How long moderation may hold the first chunk, from the turn's start (#581).
// A miss streams the turn; the verdict applies from the next one.
const MODERATION_WAIT_MS = 250;

const within = <T>(p: Promise<T>, ms: number) =>
	Promise.race([
		p,
		new Promise<null>((r) => setTimeout(() => r(null), Math.max(0, ms))),
	]);

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
 * Only #583's five audio tags reach the TTS (#603): any other bracketed text
 * is filtered out as it streams. The transcript keeps no tags at all.
 *
 * ponytail: the `[talk]` logs carry only timings, model and body keys (never
 * text); they answer #591's open measurements. Drop or downgrade them once
 * those are recorded.
 */
export const chatCompletions = httpAction(async (ctx, request) => {
	const startedAt = Date.now();
	const t: Record<string, number> = {};
	const mark = (k: string) => (t[k] ??= Date.now() - startedAt);
	const read = await readTurn(request, startedAt, mark);
	if (read instanceof Response) {
		return read;
	}
	const { body, talk, clock } = read;
	const words = turnWords(talk.lines);
	const phrase = phrasePeak(words);
	// Raced against the first chunk below; never rejects (unavailable = no verdict).
	// A loose phrase floors at elevated; moderation can still raise it to crisis.
	const moderation =
		words && phrase?.level !== "crisis"
			? moderateInput(words).then(
					(r) => (mark("moderationDone"), moderationPeak(r))
				)
			: null;
	// Started before the memory read, awaited once the model call is in flight:
	// costs no TTFT. A failed write fails closed: no turn the transcript can't hold.
	const model = talkModel(body.model);
	const bound = ctx
		.runMutation(internal.talk.turns.syncLines, {
			...talk,
			...(phrase ? { peak: phrase } : {}),
			companionVersion: companionVersion(model),
		})
		.catch((err) => {
			console.error("[talk] turn sync failed", err);
			return false;
		});
	// The verdict lands whenever it does, chained here rather than after [DONE]:
	// an interruption kills the stream (and anything after it), but the person's
	// flagged words are moderated only this turn. Idempotent with the early raise.
	const late = moderation
		? Promise.all([moderation, bound])
				.then(([peak, ok]) =>
					ok && peak
						? ctx.runMutation(internal.talk.safety.raise, {
								peak,
								sessionId: talk.sessionId,
							})
						: null
				)
				.catch((err) => console.error("[talk] safety raise failed", err))
		: null;
	// The one database read before the model call (#598): the preload is
	// fixed at talk start, the recall and the safety peak land between turns.
	const memory = await ctx
		.runQuery(internal.talk.remember.forTurn, {
			sessionId: talk.sessionId,
			talkKey: talk.talkKey,
		})
		.catch((err) => {
			console.error("[talk] memory read failed", err);
			return null;
		});
	mark("memory");

	const {
		system: agentSystem,
		messages: turns,
		tools: agentTools,
	} = toAnthropicRequest(body.messages, body.tools);
	const {
		peak,
		name,
		cue,
		systemAs,
		crisisLine: planned,
	} = planTurn({ agentSystem, clock, memory, phrase, turns });
	// Marked spoken only once fully sent: an interrupted line comes again.
	let crisisLine = planned;
	// Our own tools are listed beside the agent's and answered here, never relayed.
	const tools = [...agentTools, renameTool, personNameTool, slowTool];
	if (turns.length === 0) {
		return new Response("no turns", { status: 400 });
	}
	// The last turn ends on our end_call; tools stay listed (the history may
	// hold past calls) but the model can't make one of its own.
	const { closing } = cue;

	const meta = {
		created: Math.floor(startedAt / 1000),
		id: `chatcmpl-${crypto.randomUUID()}`,
		model,
	};
	const abort = new AbortController();
	let outcome: "done" | "aborted" | "error" | "unbound" = "done";
	let firstTokenAt: number | null = null;
	// Tag words only (e.g. "sigh"), never the turn's text: does #583's audio-tag
	// set make it through to ElevenLabs?
	const audioTags: string[] = [];
	let reply = "";
	const toolCalls: string[] = [];
	const sink: RelaySink = { emit: () => {}, toolCalls, usage: null };

	const log = () => {
		console.log("[talk] turn", {
			audioTags,
			bodyKeys: Object.keys(body),
			cacheRead: sink.usage?.cache_read_input_tokens,
			cacheWrite: sink.usage?.cache_creation_input_tokens,
			closing,
			crisisLine,
			elapsedS: Math.round(clock.elapsedMs / 1000),
			extraBodyKeys:
				body.elevenlabs_extra_body &&
				typeof body.elevenlabs_extra_body === "object"
					? Object.keys(body.elevenlabs_extra_body)
					: null,
			inputTokens: sink.usage?.input_tokens,
			// Sizes only, never the text: did the preload and recall reach this turn?
			memory: memory
				? {
						name: memory.name,
						preloadChars: memory.memory.length,
						recallChars: memory.recall.length,
					}
				: null,
			model,
			outcome,
			phasesMs: t,
			safety: peak?.level ?? null,
			silentTurns: clock.silentTurns,
			toolCalls,
			totalMs: Date.now() - startedAt,
			ttftMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
			turns: turns.length,
		});
	};

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		// ElevenLabs hung up — an interruption, or the talk ended mid-turn.
		cancel() {
			outcome = "aborted";
			abort.abort();
		},
		async start(controller) {
			const send = (s: string) => controller.enqueue(encoder.encode(s));
			try {
				const call = (
					messages: Parameters<typeof streamTurn>[0]["messages"],
					noTools: boolean,
					system = systemAs(name)
				) =>
					streamTurn({ messages, model, noTools, system, tools }, abort.signal);
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
					early = await within(
						moderation,
						MODERATION_WAIT_MS - (Date.now() - startedAt)
					);
					mark("moderated");
					if (early?.level === "crisis") {
						crisisLine = !memory?.crisisLineSpoken;
						if (crisisLine) {
							abort.abort();
						}
						// Help on screen before anything is said.
						await ctx.runMutation(internal.talk.safety.raise, {
							peak: early,
							sessionId: talk.sessionId,
						});
					}
				}
				send(sseChunk(meta, { role: "assistant" }));
				let finish: FinishReason = "stop";
				if (crisisLine) {
					firstTokenAt = Date.now();
					send(sseChunk(meta, { content: CRISIS_LINE }));
					reply = CRISIS_LINE;
				}
				sink.emit = (delta: OpenAIDelta) => {
					firstTokenAt ??= Date.now();
					mark("firstDelta");
					send(sseChunk(meta, delta));
				};
				const relay = async (events: NonNullable<typeof anthropic>) => {
					const r = await relayTurn(events, sink);
					finish = r.finish ?? finish;
					reply += r.text;
					return r;
				};
				const first = crisisLine || !anthropic ? null : await relay(anthropic);
				// One of our tools (#601 rename, #602 the person's name, #603 slow down): saved, then
				// one more call speaks to it. Skipped if the turn also relayed a tool
				// call: the agent already holds that turn.
				if (first?.own) {
					const { tool, id, json } = first.own;
					toolCalls.push(tool);
					const { input, result } = await runOwnTool(ctx, tool, json, talk);
					if (
						(finish as FinishReason) === "tool_calls" &&
						toolCalls.length === 1
					) {
						finish = "stop";
						// The follow-up already speaks as the new name, or to the person by theirs.
						// The follow-up to a slow-down is already slowed.
						const as =
							tool === SLOW_TOOL
								? systemAs(
										name,
										memory?.person,
										result.ok
											? { ...memory?.style, slowed: true }
											: memory?.style
									)
								: tool === PERSON_NAME_TOOL
									? systemAs(
											name,
											result.ok && result.name
												? { ask: false, name: result.name }
												: memory?.person
										)
									: systemAs(result.ok && result.name ? result.name : name);
						const answer = ownToolAnswer(tool, result, name);
						await relay(
							call(
								[
									...turns,
									...ownToolTurns(first.text, id, tool, input, answer),
								],
								true,
								as
							)
						);
					}
				}
				// Never hang up on the crisis line (#581).
				if (closing && !crisisLine) {
					const call = {
						id: `call_${crypto.randomUUID()}`,
						index: 0,
						type: "function" as const,
					};
					send(
						sseChunk(meta, {
							tool_calls: [
								{
									...call,
									function: {
										arguments: '{"reason":"talk ended"}',
										name: END_CALL,
									},
								},
							],
						})
					);
					toolCalls.push(END_CALL);
					finish = "tool_calls";
				}
				send(sseChunk(meta, {}, finish));
				send(SSE_DONE);
				// After [DONE]: the agent already has its turn.
				await ctx.runMutation(internal.talk.turns.syncLines, {
					reply: { seq: talk.lines.length, text: stripAudioTags(reply) },
					sessionId: talk.sessionId,
					talkKey: talk.talkKey,
				});
				// A verdict that missed the race (`late`) applies from the next turn.
				if (crisisLine) {
					await ctx.runMutation(internal.talk.safety.raise, {
						crisisLineSpoken: true,
						sessionId: talk.sessionId,
					});
				}
				controller.close();
				await late;
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
				for (const m of reply.matchAll(/\[([a-z][a-z ]{0,30})\]/gi)) {
					audioTags.push(m[1]);
				}
				log();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"cache-control": "no-cache",
			"content-type": "text/event-stream",
		},
	});
});
