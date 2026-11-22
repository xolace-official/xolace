import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
	emotionAdjective,
	firstSentence,
	saidByUser,
	tidyPhrase,
	typeset,
} from "../exercises/slots";
import {
	extractTextFromResponse,
	getAnthropicClient,
	SLOT_FILL_MODEL,
	thinkingOff,
} from "./providers/anthropic";

const MAX_PHRASE_WORDS = 6;

/**
 * Fill exercise slot values for a session.
 *
 * Deterministic slots are resolved directly: mirror_line is the mirror's
 * first sentence, user_emotion the emotion as an adjective ("angry"); an
 * emotion with no adjective stays unfilled. user_phrase is extracted via a
 * single Haiku call and kept only when the person wrote or said it word for
 * word (`saidByUser`): Sit with this quotes it back as theirs ("You said: …"),
 * so it never puts the mirror's words in their mouth.
 * Any failure swallows silently — beats fall back to defaultContent.
 */
export const fillSlots = internalAction({
	args: {
		exerciseTitle: v.string(),
		mirrorText: v.string(),
		primaryEmotion: v.string(),
		sessionId: v.id("sessions"),
		slotKeys: v.array(v.string()),
		userLanguageTags: v.array(v.string()),
		/**
		 * What the person wrote or said (a talk's own lines only). Optional for
		 * jobs scheduled before it existed: without it user_phrase stays
		 * unfilled and the default line plays.
		 */
		userText: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.slotKeys.length === 0) {
			return;
		}

		const slots: Record<string, string> = {};

		// Fill deterministic slots without LLM
		for (const key of args.slotKeys) {
			if (key === "mirror_line") {
				const line = typeset(firstSentence(args.mirrorText));
				if (line) {
					slots[key] = line;
				}
			} else if (key === "user_emotion") {
				const adjective = emotionAdjective(args.primaryEmotion);
				if (adjective) {
					slots[key] = adjective;
				}
			}
		}

		const userText = args.userText?.trim() ?? "";
		const llmKeys = userText
			? args.slotKeys.filter((k) => k === "user_phrase")
			: [];

		if (llmKeys.length > 0) {
			try {
				const anthropic = getAnthropicClient();

				const userPrompt = `What they wrote or said: "${userText}"
Mirror (context only): "${args.mirrorText}"
Primary emotion: ${args.primaryEmotion}

Extract a slot value as a JSON object. Return null if you cannot fill it from their words.

Slot to fill:
- user_phrase: 2–${MAX_PHRASE_WORDS} words that name what they feel, copied exactly as they appear in "What they wrote or said", in the same order. Never words only the mirror used, never a paraphrase. Lowercase, no trailing punctuation.

Respond with only a JSON object, for example: {"user_phrase": "stuck and can't move"}`;

				const response = await anthropic.messages.create({
					max_tokens: 150,
					messages: [{ content: userPrompt, role: "user" }],
					model: SLOT_FILL_MODEL,
					system:
						"You extract concise phrases to personalize emotional processing exercises. Return only valid JSON.",
					thinking: thinkingOff(SLOT_FILL_MODEL),
				});

				const raw = extractTextFromResponse(response).trim();
				const cleaned = raw
					.replace(/^```json\s*/i, "")
					.replace(/^```\s*/i, "")
					.replace(/\s*```$/i, "")
					.trim();

				const parsed = JSON.parse(cleaned);

				for (const key of llmKeys) {
					const val = parsed[key];
					if (typeof val !== "string") {
						continue;
					}
					const normalized = val
						.toLowerCase()
						.replace(/[.,;:!?"'`]+$/g, "")
						.replace(/\s+/g, " ")
						.trim();
					const words = normalized.split(" ");
					if (
						!normalized ||
						words.length > MAX_PHRASE_WORDS ||
						!saidByUser(normalized, userText)
					) {
						continue;
					}
					slots[key] = tidyPhrase(normalized);
				}
			} catch {
				// Haiku failed — user_phrase will fall back to defaultContent in the runner
			}
		}

		if (Object.keys(slots).length > 0) {
			await ctx.runMutation(internal.sessions.writeExerciseSlots, {
				sessionId: args.sessionId,
				slots,
			});
		}
	},
});
