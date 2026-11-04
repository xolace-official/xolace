/**
 * The Talk demo's one turn (#714), for the client's demo overlay: the person's
 * line (on-device transcription, or typed) in, Flux's deeper question and its
 * audio in the voice they picked out. The words are read and dropped: nothing
 * here stores them, and the spoken reply is deleted from storage shortly after.
 *
 * The turn is claimed first (`talkDemo/demo.claimTurn`), so its limits hold
 * before any model or voice is paid for.
 */
import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { type ActionCtx, action } from "../../_generated/server";
import {
	resolveVoiceId,
	VOICE_CATALOG,
	voiceSlugValidator,
} from "../../lib/voices";
import { checkAnswerSafety } from "../intake/read";
import {
	extractTextFromResponse,
	getAnthropicClient,
	TALK_DEMO_MODEL,
	thinkingOff,
} from "../providers/anthropic";
import type { DemoPrompt } from "./prompt";
import { type DemoReply, demoReplyValidator, replyToLine } from "./replying";

/** Twice what one spoken sentence or two runs to. */
const MAX_LINE_CHARS = 1000;

/** Two tries of 5s: the person is watching Flux think. */
const REQUEST_OPTIONS = { maxRetries: 1, timeout: 5000 };

/** One question back: a sentence or two. */
const WRITER_MAX_TOKENS = 200;

const TTS_TIMEOUT_MS = 15_000;
// The vent's voice settings: one short line, said warmly.
const TTS_MODEL = "eleven_v3";
const TTS_STABILITY = 0.4;

/** The client plays the reply once, as it shows; this covers a backgrounded app coming back. */
const AUDIO_TTL_MS = 10 * 60 * 1000;

async function writeQuestion(prompt: DemoPrompt) {
	const response = await getAnthropicClient().messages.create(
		{
			max_tokens: WRITER_MAX_TOKENS,
			messages: [{ content: prompt.user, role: "user" }],
			model: TALK_DEMO_MODEL,
			system: prompt.system,
			thinking: thinkingOff(TALK_DEMO_MODEL),
		},
		REQUEST_OPTIONS
	);
	return extractTextFromResponse(response);
}

/** Flux's question in the picked voice, stored for a short while. Null when it couldn't be made. */
async function speak(
	ctx: ActionCtx,
	text: string,
	voiceId: string
): Promise<string | null> {
	const apiKey = process.env.ELEVENLABS_VOICE_API_KEY;
	if (!apiKey) {
		return null;
	}
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
	try {
		const res = await fetch(
			`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
			{
				body: JSON.stringify({
					model_id: TTS_MODEL,
					text,
					voice_settings: { stability: TTS_STABILITY, use_speaker_boost: true },
				}),
				headers: {
					Accept: "audio/mpeg",
					"Content-Type": "application/json",
					"xi-api-key": apiKey,
				},
				method: "POST",
				signal: controller.signal,
			}
		);
		if (!res.ok) {
			console.error(`[talkDemo] TTS error ${res.status}: ${await res.text()}`);
			return null;
		}
		const blob = new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
		const storageId = await ctx.storage.store(blob);
		await ctx.scheduler.runAfter(
			AUDIO_TTL_MS,
			internal.talkDemo.demo.dropAudio,
			{
				storageId,
			}
		);
		return await ctx.storage.getUrl(storageId);
	} catch (err) {
		console.error("[talkDemo] TTS failed", err);
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

export const reply = action({
	args: { line: v.string(), voice: voiceSlugValidator },
	handler: async (ctx, { line, voice }): Promise<DemoReply> => {
		const words = line.trim();
		if (words.length === 0 || words.length > MAX_LINE_CHARS) {
			throw new ConvexError({
				code: "invalid_line",
				message: `A line is 1 to ${MAX_LINE_CHARS} characters`,
			});
		}
		const demoId: Id<"talk_demos"> = await ctx.runMutation(
			internal.talkDemo.demo.claimTurn,
			{}
		);
		const turn = await replyToLine(words, {
			checkSafety: checkAnswerSafety,
			writeQuestion,
		});
		await ctx.runMutation(internal.talkDemo.demo.markEnded, {
			demoId,
			endedBy: turn.route,
		});
		if (turn.route === "safety") {
			return turn;
		}
		const voiceId = resolveVoiceId(voice, VOICE_CATALOG.vesper.elevenLabsId);
		return { ...turn, audioUrl: await speak(ctx, turn.text, voiceId) };
	},
	returns: demoReplyValidator,
});
