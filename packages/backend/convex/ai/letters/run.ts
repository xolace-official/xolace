/**
 * The letters check's model calls (#750), for an action to pass to
 * `checkLetterText` (`letters/decide.ts`): the sender's safety, intake's
 * recipe with the letters phrase floor (`floor.ts`), and the letters
 * classifier beside it. Neither stores
 * or logs the letter's words.
 */
import type { LetterCheckDeps } from "../../letters/decide";
import { checkWordsSafety, SAFETY_DEADLINE_MS, within } from "../intake/read";
import {
	extractTextFromResponse,
	getAnthropicClient,
	thinkingOff,
} from "../providers/anthropic";
import {
	buildLetterCheckPrompt,
	LETTER_CHECK_MODEL,
	type LetterVerdict,
	parseLetterCheckResponse,
} from "./check";
import { letterPhrasePeak } from "./floor";

/** Each try's limit; {@link SAFETY_DEADLINE_MS} bounds the call as a whole. */
const REQUEST_OPTIONS = { maxRetries: 1, timeout: 5000 };

/** Room for the verdict's twelve fields and nothing else. */
const MAX_TOKENS = 200;

/**
 * The classifier's verdict, or `null` if it failed, didn't parse, or ran past
 * the deadline: the check reads `null` as this half unavailable.
 */
export async function classifyLetter(
	text: string
): Promise<LetterVerdict | null> {
	const abort = new AbortController();
	const prompt = buildLetterCheckPrompt(text);
	const call = getAnthropicClient()
		.messages.create(
			{
				max_tokens: MAX_TOKENS,
				messages: [{ content: prompt.user, role: "user" }],
				model: LETTER_CHECK_MODEL,
				system: prompt.system,
				thinking: thinkingOff(LETTER_CHECK_MODEL),
			},
			{ ...REQUEST_OPTIONS, signal: abort.signal }
		)
		.then((response) =>
			parseLetterCheckResponse(extractTextFromResponse(response))
		)
		.catch((err: unknown) => {
			// The deadline's own abort has already logged.
			if (!abort.signal.aborted) {
				console.error("[letters] classifier failed", err);
			}
			return null;
		});
	return await within(
		call,
		SAFETY_DEADLINE_MS,
		() => {
			console.error("[letters] classifier past the safety deadline");
			return null;
		},
		abort
	);
}

/** The live calls, for the send action and the background re-check. */
export const letterCheckDeps: LetterCheckDeps = {
	classify: classifyLetter,
	safety: (text) => checkWordsSafety(text, letterPhrasePeak),
};
