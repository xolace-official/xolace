/**
 * The letters check's phrase floor (owner, 19 Nov 2026). Talk's floor
 * (`talk/safety.ts`) raises on any crisis or distress phrase, which is right
 * for someone talking about themselves now. A letter to a stranger often
 * speaks of the past or of someone else ("a few years ago I tried to end my
 * life", "I lost my brother to suicide"), and that's often what makes it kind.
 *
 * So each sentence is floored on its own, and one that only mentions a phrase
 * (past tense, or about someone else) doesn't count: moderation and the
 * safeguard decide those. A present-tense, first-person phrase still raises
 * exactly as talk's does. Intake's floor is untouched.
 */
import { phrasePeak } from "../../talk/safety";
import { levelAbove, type TalkPeak } from "../safeguard";

/**
 * Where one sentence or clause ends: punctuation, a line break, a dash, or a
 * turn like ", but", so "I used to, but now I want to kill myself" is two.
 */
const SENTENCE_BREAK = /[.!?;\n]+|\s[-–—]\s|,?\s+(?:but|yet|and now|now)\s+/;

/**
 * Marks a sentence as about the past, not now. Narrow on purpose: "was" or
 * "last night" stay in, since a recent crisis is still a crisis, and the
 * safeguard reads those.
 */
const PAST =
	/\b(used to|tried to|attempted|ago\b|back then|back when|when i was (younger|a (kid|child|teen(ager)?))|in the past|survived|survivor|recovered from|i'?ve been there)/;

/** Marks a sentence's suicide or self-harm as someone else's. */
const SOMEONE_ELSE =
	/\b(lost (my|a|our|her|his|their) [a-z' ]{1,30}? to suicide|died (by|of|from) suicide|took (his|her|their) (own )?life|(his|her|their|[a-z]+'s) suicide|suicide of|(he|she|they) (killed|hurt|harmed|cut) (him|her|them)sel(f|ves))/;

/** True when a sentence mentions a phrase rather than saying it of now. */
function onlyMentions(sentence: string): boolean {
	return PAST.test(sentence) || SOMEONE_ELSE.test(sentence);
}

/**
 * The highest phrase peak among the letter's present-tense, first-person
 * sentences, or `null`. Same shape as talk's `phrasePeak`, so it drops into
 * `checkWordsSafety`.
 */
export function letterPhrasePeak(text: string): TalkPeak | null {
	let peak: TalkPeak | null = null;
	const normalised = text.toLowerCase().replace(/[’‘]/g, "'");
	for (const sentence of normalised.split(SENTENCE_BREAK)) {
		const found = phrasePeak(sentence);
		if (
			found &&
			!onlyMentions(sentence) &&
			(!peak || levelAbove(found.level, peak.level))
		) {
			peak = found;
		}
	}
	return peak;
}
