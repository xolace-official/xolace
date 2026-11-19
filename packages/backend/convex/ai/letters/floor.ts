/**
 * The letters check's phrase floor (owner, 19 Nov 2026). Talk's floor
 * (`talk/safety.ts`) raises on any crisis or distress phrase, which is right
 * for someone talking about themselves now. A letter to a stranger often
 * speaks of the past or of someone else ("a few years ago I tried to end my
 * life", "I lost my brother to suicide"), and that's often what makes it kind.
 *
 * So a mention is cut out before talk's floor reads the letter: only the span
 * a marker governs ("tried to end my life", "used to think about hurting
 * myself", "lost my brother to suicide"), never the rest of the clause. Every
 * other phrase is read exactly as talk's floor reads it, so "a week ago I lost
 * my job and I want to kill myself" still raises to crisis. An attempt in a
 * sentence that says it was recent ("last night", "today") isn't a mention.
 * Moderation and the safeguard read the whole letter either way. Intake's
 * floor is untouched.
 */
import { phrasePeak } from "../../talk/safety";
import type { TalkPeak } from "../safeguard";

/**
 * Every phrase talk's floor raises on (`CRISIS_PHRASES` and `DISTRESS_PHRASES`
 * in `talk/safety.ts`), as one alternation a marker can govern. A phrase
 * missing here is never cut, so it still raises: the safe direction.
 */
const PHRASE =
	"(?:kill(?:ing)? my ?self|(?:end|take|ending|taking) (?:my|my own) life|better off dead|no reason to (?:live|go on|be here)|suicid(?:e|al)|(?:want|wanna|going) (?:to )?die|(?:don'?t|do not) want to (?:be alive|live|wake up)|(?:hurt(?:ing)?|harm(?:ing)?|cut(?:ting)?) my ?self|end it all)";

/** A few words between a marker and the phrase it governs, within a clause. */
const GAP = (max: number) => `(?:[a-z']+ ){0,${max}}?`;

/** A past attempt; not a mention when the sentence says it was recent. */
const ATTEMPT = new RegExp(`\\b(?:tried|attempted) to ${GAP(2)}${PHRASE}`, "g");

/** Says the attempt was recent, so it's still a crisis now. */
const RECENT =
	/\b(last night|tonight|today|this (morning|afternoon|evening|week)|yesterday|just now|earlier|again)\b/;

/** Mentions that are always about the past or about someone else. */
const MENTIONS = [
	// "I used to think about hurting myself".
	new RegExp(`\\bused to ${GAP(3)}${PHRASE}`, "g"),
	// "I survived a suicide attempt", "recovered from being suicidal".
	new RegExp(`\\b(?:survived|recovered from) ${GAP(3)}${PHRASE}`, "g"),
	// Someone else's: "lost my brother to suicide", "died by suicide",
	// "my brother's suicide", "the suicide of a friend".
	/\blost (my|a|our|her|his|their) [a-z' ]{1,30}? to suicide\b/g,
	/\bdied (by|of|from) suicide\b/g,
	/\b(his|her|their|[a-z]+'s) suicide\b/g,
	/\bsuicide of (my|a|our|her|his|their) [a-z]+/g,
];

/** Where a sentence ends, which is as far as `RECENT` reaches. */
const SENTENCE_END = /[.!?;\n]+/;

/**
 * Talk's phrase peak of the letter with its mentions cut out, or `null`. Same
 * shape as talk's `phrasePeak`, so it drops into `checkWordsSafety`.
 */
export function letterPhrasePeak(text: string): TalkPeak | null {
	const kept = text
		.toLowerCase()
		.replace(/[’‘]/g, "'")
		.split(SENTENCE_END)
		.map((sentence) => {
			let rest = RECENT.test(sentence)
				? sentence
				: sentence.replace(ATTEMPT, " ");
			for (const mention of MENTIONS) {
				rest = rest.replace(mention, " ");
			}
			return rest;
		});
	return phrasePeak(kept.join(". "));
}
