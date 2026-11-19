/**
 * The letters check's phrase floor (owner, 19 Nov 2026). Talk's floor
 * (`talk/safety.ts`) raises on any crisis or distress phrase, which is right
 * for someone talking about themselves now. A letter to a stranger often
 * speaks of the past or of someone else ("a few years ago I tried to end my
 * life", "I lost my brother to suicide"), and that's often what makes it kind.
 *
 * Fail-safe: a discount here never lets a letter pass on its own. Cutting a
 * mention only turns "certain" into "ask": `discountedPeak` reports what talk's
 * floor would have said, and the check (`letters/decide.ts`) routes the letter
 * to risk at that level unless the letters classifier says every mention is
 * past or someone else's. So these patterns only decide which letters the
 * classifier is asked about; a pattern that cuts too much costs nothing worse
 * than a question.
 *
 * A mention is only the span its marker governs ("tried to end my life",
 * "used to think about hurting myself", "lost my brother to suicide"), never
 * across "and", "but", "so" or a new "I", and never "I'm used to", which is
 * now. An attempt in a letter that says anything was recent ("last night",
 * "last week", "two days ago") isn't a mention. Moderation and the safeguard
 * read the whole letter either way. Intake's floor is untouched.
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

/**
 * One word inside a governed span: never a joining word or a new subject, so
 * a span can't reach from a past clause into a present one ("I survived today
 * and I want to die").
 */
const WORD =
	"(?!(?:and|but|so|or|then|now|still|yet|because|cause|cuz|though|although|i|i'm|im|i've|i'll|i'd|ill|me|myself|will|gonna|going)\\b)[a-z']+";

/** A few words between a marker and the phrase it governs, within a clause. */
const GAP = (max: number) => `(?:${WORD} ){0,${max}}?`;

/** A past attempt; never a mention in a letter that says it was recent. */
const ATTEMPT = new RegExp(`\\b(?:tried|attempted) to ${GAP(2)}${PHRASE}`, "g");

/** Says something was recent, so an attempt in the letter is still now. */
const RECENT = new RegExp(
	[
		"last (?:night|week|weekend|month)",
		"tonight",
		"today",
		"this (?:morning|afternoon|evening|week|weekend|month)",
		"yesterday",
		"just now",
		"earlier",
		"again",
		"recently",
		"lately",
		"(?:\\d+|a|an|one|two|three|four|five|six|seven|a few|few|a couple of|couple of|several) (?:minutes?|hours?|days?|weeks?|nights?) ago",
	]
		.map((part) => `\\b${part}\\b`)
		.join("|")
);

/** "I'm used to", "so used to": a habit that's still going, not the past. */
const NOT_PAST_HABIT =
	"(?<!(?:'m|\\bam|\\bare|\\bis|'re|'s|\\bget|\\bgot|\\bgetting|\\bso|\\bwas|\\bwere|\\bbe|\\bbeen|\\bbecome|\\bbecoming|\\bfeel|\\bquite|\\breally|\\btoo|\\bvery|\\bpretty) )";

/** Mentions that are only ever about the past or about someone else. */
const MENTIONS = [
	// "I used to think about hurting myself".
	new RegExp(`${NOT_PAST_HABIT}\\bused to ${GAP(3)}${PHRASE}`, "g"),
	// "I survived a suicide attempt", "recovered from being suicidal".
	new RegExp(`\\b(?:survived|recovered from) ${GAP(3)}${PHRASE}`, "g"),
	// Someone else's: "lost my brother to suicide", "my friend died by suicide",
	// "my brother's suicide", "the suicide of a friend".
	new RegExp(
		`\\blost (?:my|a|our|her|his|their) ${GAP(2)}${WORD} to suicide\\b`,
		"g"
	),
	new RegExp(
		`\\b(?:he|she|they|who|(?:my|our|his|her|their|a|the) ${GAP(2)}${WORD}) died (?:by|of|from) suicide\\b`,
		"g"
	),
	/\b(?:his|her|their|(?:my|our|his|her|their|a|the) [a-z]+'s) suicide\b/g,
	/\bsuicide of (?:my|a|our|her|his|their) [a-z]+/g,
];

/** Where a sentence ends. */
const SENTENCE_END = /[.!?;\n]+/;

const RANK = { crisis: 2, elevated: 1, none: 0 } as const;
const rankOf = (peak: TalkPeak | null) => RANK[peak?.level ?? "none"];

/** The letter, lowercased with straight apostrophes, mentions cut out. */
function withoutMentions(text: string): string {
	const lower = text.toLowerCase().replace(/[’‘]/g, "'");
	const recent = RECENT.test(lower);
	return lower
		.split(SENTENCE_END)
		.map((sentence) => {
			let rest = recent ? sentence : sentence.replace(ATTEMPT, " ");
			for (const mention of MENTIONS) {
				rest = rest.replace(mention, " ");
			}
			return rest;
		})
		.join(". ");
}

/**
 * Talk's phrase peak of the letter with its mentions cut out, or `null`. Same
 * shape as talk's `phrasePeak`, so it drops into `checkWordsSafety`: the
 * engine then reads a discounted letter instead of the floor answering alone.
 */
export function letterPhrasePeak(text: string): TalkPeak | null {
	return phrasePeak(withoutMentions(text));
}

/**
 * What talk's floor would have said, when cutting mentions lowered it, else
 * `null`. Non-null means the letter may only pass if the classifier confirms
 * every mention is past or someone else's.
 */
export function discountedPeak(text: string): TalkPeak | null {
	const full = phrasePeak(text);
	return rankOf(full) > rankOf(letterPhrasePeak(text)) ? full : null;
}
