/**
 * The pieces of one talk turn that chatCompletions.ts orchestrates: reading
 * the request, the model call, relaying it, and answering our own tools.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { timingSafeEqual } from "../../lib/timingSafeEqual";
import { talkClockOf } from "../../talk/clock";
import { talkLines } from "../../talk/transcript";
import {
	OWN_TOOLS,
	type OwnToolResult,
	PERSON_NAME_TOOL,
	SLOW_TOOL,
} from "../prompts/companion";
import { getAnthropicClient, thinkingOff } from "../providers/anthropic";
import { createTagFilter } from "./audioTags";
import type { OpenAIMessage, OpenAITool } from "./openaiCompat";
import {
	createEventTranslator,
	type FinishReason,
	type OpenAIDelta,
} from "./openaiSse";

// The agent's Custom LLM `model_id` picks one of these; anything else gets
// the first. Both are listed so the prototype can measure TTFT on each (#591).
const TALK_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"] as const;
// A spoken turn is a few sentences.
const TALK_MAX_TOKENS = 400;

export const talkModel = (id: string | undefined) =>
	TALK_MODELS.find((m) => m === id) ?? TALK_MODELS[0];

// Stamped on each talk's mirror (#606), "{writer}-v{N}-{model}" like mirrorModelVersion.
// Bump N on any change the talk eval (#605) gates: the companion prompt, the
// safety skill or crisis line, turn assembly, or the ElevenLabs agent's own prompt.
const COMPANION_VERSION = "companion-v1";
export const companionVersion = (model: (typeof TALK_MODELS)[number]) =>
	`${COMPANION_VERSION}-${model.replace(/^claude-/, "").replace(/-(\d+)-(\d+)$/, "-$1.$2")}`;

// Digests first so the compare is fixed-length and leaks nothing of the secret.
async function sha256Hex(s: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(s)
	);
	return Array.from(new Uint8Array(digest), (b) =>
		b.toString(16).padStart(2, "0")
	).join("");
}

export type TurnBody = {
	model?: string;
	messages: OpenAIMessage[];
	tools?: OpenAITool[];
	elevenlabs_extra_body?: unknown;
};

/** The authorized, bound turn, or the response that refuses it. */
export async function readTurn(
	request: Request,
	now: number,
	mark: (k: string) => void
) {
	const secret = process.env.TALK_LLM_SECRET;
	const auth = request.headers.get("authorization") ?? "";
	// Fail closed: an unset secret must not open the endpoint.
	if (
		!(
			secret &&
			timingSafeEqual(
				await sha256Hex(auth),
				await sha256Hex(`Bearer ${secret}`)
			)
		)
	) {
		return new Response("unauthorized", { status: 401 });
	}
	mark("auth");

	let body: Partial<TurnBody>;
	try {
		body = await request.json();
	} catch {
		return new Response("invalid json", { status: 400 });
	}
	mark("parsed");
	if (!Array.isArray(body.messages)) {
		return new Response("messages required", { status: 400 });
	}
	const extra = (body.elevenlabs_extra_body ?? {}) as {
		sessionId?: unknown;
		talkKey?: unknown;
	};
	if (
		typeof extra.sessionId !== "string" ||
		typeof extra.talkKey !== "string"
	) {
		return new Response("no talk", { status: 403 });
	}
	const talk = {
		lines: talkLines(body.messages),
		sessionId: extra.sessionId,
		talkKey: extra.talkKey,
	};
	const clock = talkClockOf(talk.talkKey, talk.lines, now);
	if (!clock) {
		return new Response("no talk", { status: 403 });
	}
	return { body: body as TurnBody, clock, talk };
}

type StreamParams = Parameters<Anthropic["messages"]["stream"]>[0];

export const streamTurn = (
	req: {
		model: string;
		system: NonNullable<StreamParams["system"]>;
		tools: StreamParams["tools"];
		messages: StreamParams["messages"];
		noTools: boolean;
	},
	signal: AbortSignal
) =>
	getAnthropicClient().messages.stream(
		{
			max_tokens: TALK_MAX_TOKENS,
			model: req.model,
			thinking: thinkingOff(req.model),
			...(req.system.length ? { system: req.system } : {}),
			// The agent's system tools (end_call) and our rename — the model decides to use them.
			tools: req.tools,
			...(req.noTools ? { tool_choice: { type: "none" as const } } : {}),
			// From eu-west-1, "us" cut Haiku's median TTFT by 140–290 ms over
			// "global" in three A/Bs; Sonnet within noise (#591).
			inference_geo: "us",
			messages: req.messages,
		},
		// One attempt: a retried turn would land long after the person stopped waiting.
		{ maxRetries: 0, signal }
	);

export type TalkStream = ReturnType<typeof streamTurn>;
type Usage = {
	input_tokens: number;
	cache_read_input_tokens?: number | null;
	cache_creation_input_tokens?: number | null;
};
export type RelaySink = {
	emit: (delta: OpenAIDelta) => void;
	toolCalls: string[];
	usage: Usage | null;
};

/** Relays one model call; a call to one of our tools is held back and returned. */
export async function relayTurn(events: TalkStream, sink: RelaySink) {
	const translate = createEventTranslator();
	const tags = createTagFilter();
	let text = "";
	let finish: FinishReason | undefined;
	const emit = (delta: OpenAIDelta) => {
		sink.emit(delta);
		text += delta.content ?? "";
	};
	let own: { tool: string; index: number; id: string; json: string } | null =
		null;
	for await (const event of events) {
		if (event.type === "message_start") {
			sink.usage ??= event.message.usage;
		}
		if (
			event.type === "content_block_start" &&
			event.content_block.type === "tool_use" &&
			OWN_TOOLS.includes(event.content_block.name)
		) {
			own = {
				id: event.content_block.id,
				index: event.index,
				json: "",
				tool: event.content_block.name,
			};
			continue;
		}
		if (
			own &&
			event.type === "content_block_delta" &&
			event.index === own.index
		) {
			if (event.delta.type === "input_json_delta") {
				own.json += event.delta.partial_json;
			}
			continue;
		}
		const out = translate(event);
		if (!out) {
			continue;
		}
		if ("finish" in out) {
			finish = out.finish;
			continue;
		}
		const { content, ...rest } = out.delta;
		if (content !== undefined) {
			// Held while a "[" is open; stripped if it isn't one of our tags.
			const kept = tags.push(content);
			if (kept) {
				emit({ ...rest, content: kept });
			}
			continue;
		}
		// Text held before a tool call goes first.
		const held = tags.flush();
		if (held) {
			emit({ content: held });
		}
		emit(out.delta);
		for (const call of out.delta.tool_calls ?? []) {
			if (call.function.name) {
				sink.toolCalls.push(call.function.name);
			}
		}
	}
	const held = tags.flush();
	if (held) {
		emit({ content: held });
	}
	return { finish, own, text };
}

/** Saves one of our tools' calls (#601 rename, #602 the person's name, #603 slow down). */
export async function runOwnTool(
	ctx: ActionCtx,
	tool: string,
	json: string,
	talk: { sessionId: string; talkKey: string }
) {
	let input: { name?: unknown } = {};
	try {
		input = JSON.parse(json || "{}");
	} catch {}
	const bind = {
		name: typeof input.name === "string" ? input.name : "",
		sessionId: talk.sessionId,
		talkKey: talk.talkKey,
	};
	const result: OwnToolResult =
		tool === SLOW_TOOL
			? await ctx.runMutation(internal.talk.companion.slowDown, {
					sessionId: talk.sessionId,
					talkKey: talk.talkKey,
				})
			: tool === PERSON_NAME_TOOL
				? await ctx.runMutation(internal.talk.companion.setPersonName, bind)
				: await ctx.runMutation(internal.talk.companion.rename, bind);
	return { input, result };
}
