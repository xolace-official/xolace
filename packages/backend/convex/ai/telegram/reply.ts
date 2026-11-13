/**
 * The model call behind a Telegram reply (#770). Single turn, on Talk's
 * model and memory preload; nothing here writes anything.
 */
import {
	extractTextFromResponse,
	getAnthropicClient,
	thinkingOff,
} from "../providers/anthropic";
import { talkModel } from "../talk/turn";
import {
	buildReplyPrompt,
	type ReplyInput,
	type ReplyPrompt,
	shapeReply,
} from "./replyPrompt";

/** Talk's default model. */
export const TELEGRAM_REPLY_MODEL = talkModel(undefined);

const REPLY_MAX_TOKENS = 300;
/** Each call's own retries (errors, 429s) and limit. */
const REQUEST_OPTIONS = { maxRetries: 2, timeout: 15_000 };
/** A reply that breaks the shape gets one more try. */
const SHAPE_ATTEMPTS = 2;

/** The model's raw text for this prompt. Exported for the reply eval. */
export async function writeRaw(prompt: ReplyPrompt): Promise<string> {
	const response = await getAnthropicClient().messages.create(
		{
			max_tokens: REPLY_MAX_TOKENS,
			messages: [{ content: prompt.user, role: "user" }],
			model: TELEGRAM_REPLY_MODEL,
			system: prompt.system,
			thinking: thinkingOff(TELEGRAM_REPLY_MODEL),
		},
		REQUEST_OPTIONS
	);
	return extractTextFromResponse(response);
}

/**
 * The reply to send, or null once the model has failed (after its retries)
 * or twice broken the shape: the caller sends the fixed failure line.
 */
export async function writeReply(input: ReplyInput): Promise<string | null> {
	const prompt = buildReplyPrompt(input);
	for (let attempt = 0; attempt < SHAPE_ATTEMPTS; attempt++) {
		let raw: string;
		try {
			raw = await writeRaw(prompt);
		} catch (error) {
			console.error("[telegram] reply model failed", error);
			return null;
		}
		const reply = shapeReply(raw, {
			domain: input.card?.domain,
			reach: input.reach,
		});
		if (reply) {
			return reply;
		}
		console.warn("[telegram] reply broke its shape", { attempt });
	}
	return null;
}
