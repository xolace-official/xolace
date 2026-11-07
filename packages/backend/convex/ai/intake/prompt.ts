/**
 * The reader prompt for intake v2's first answer (#708). The values it lists
 * are the ones `reading.ts` accepts, so the model can't be told about an
 * answer the parser would drop. Quality is measured by the live eval
 * (`prompts/__evals__/intakeReader.eval.test.ts`), not unit tests.
 */
import type { FirstAnswerInput } from "./reading";

export type AllowedValues = Record<
	"disclosureStyle" | "emotionAwareness" | "intent" | "weighingOn",
	readonly string[]
>;

export type ReaderPrompt = { system: string; user: string };

const quoted = (values: readonly string[]) =>
	values.map((value) => `"${value}"`).join(", ");

export function buildReaderPrompt(
	input: FirstAnswerInput,
	allowed: AllowedValues
): ReaderPrompt {
	const system = `You read one short answer a new user gave to "What's been sitting with you lately?" and turn it into intake fields for Xolace, an app for putting feelings into words.

You are not replying to them. You never diagnose, label their feelings, or judge how much they are struggling. You only record what their words clearly say.

## Fields
- "intent": why they came. One of ${quoted(allowed.intent)}.
  understand_feelings = wants to make sense of what they feel; get_through_hard_moment = something is hard right now; feel_less_alone = lonely, wants company; make_it_regular = wants a habit of checking in; just_looking = browsing, curious, nothing in particular.
- "weighingOn": what it's about. A list of up to 3 from ${quoted(allowed.weighingOn)}.
  cant_name_yet = they say they don't know what it is.
- "disclosureStyle": how they tend to share. One of ${quoted(allowed.disclosureStyle)}.
  Only from what they say about themselves ("I usually bottle it up", "I just need to dump this"), never from how long the answer is.
- "emotionAwareness": how well they can name what they feel. One of ${quoted(allowed.emotionAwareness)}.
  know_and_can_say = names a feeling plainly; know_but_no_words = says they can't find the words; something_off_unclear = something feels wrong but they can't tell what; numb_or_cant_tell = numb, empty, flat.

## Confidence
Give each field you include a confidence from 0 to 1: how plainly the words say it.
Leave a field out when the words don't say it. Never guess to fill a field. A one-word or vague answer usually supports only one field, or none.

## Follow-up
If "weighingOn" or "intent" is unclear, you may suggest ONE short, warm follow-up question about that one field, in plain words, under 20 words, with no advice and no labels.${
		input.followUp
			? "\nThey have already answered a follow-up. Do not suggest another."
			: ""
	}

## Output
Respond with ONLY a JSON object, no prose and no markdown fences:
{"fields": {"<field>": {"value": <value>, "confidence": <number>}}, "followUp": {"field": "<field>", "question": "<question>"}}
Omit "followUp" when you have none.`;

	const user = input.followUp
		? `Their answer:\n${input.answer.trim()}\n\nYou asked: ${input.followUp.question.trim()}\nThey said:\n${input.followUp.reply.trim()}`
		: `Their answer:\n${input.answer.trim()}`;

	return { system, user };
}
