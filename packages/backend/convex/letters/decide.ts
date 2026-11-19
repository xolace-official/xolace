/**
 * The check at send (#750), minus the database: what a letter's words earn.
 * The send action and the background re-check both run `checkLetterText` with
 * the live model calls (`ai/letters/run.ts`); tests pass stubs.
 *
 * Nothing here stores, logs or returns the words.
 */
import type { WordsVerdict } from "../ai/intake/read";
import type { LetterVerdict } from "../ai/letters/check";
import type { TalkPeak } from "../ai/safeguard";
import { contactLeakIn, urlIn } from "../lib/contactPatterns";
import type { FixableCategory } from "./lines";

/**
 * The languages a letter may be written in. English only at launch: the phrase
 * floor and both prompts are English-first (#750). Widen once the checks are
 * tested in another language.
 */
export const LETTER_LANGUAGES: readonly string[] = ["en"];

/** What the check decided, first that applies, in this order. */
export type LetterCheck =
	/** The sender may be at risk: care, an escalation, nothing stored. */
	| { kind: "risk"; peak: TalkPeak | null }
	/** Hostile: stored for review, a strike, never placed. */
	| { kind: "held" }
	/** Not in `LETTER_LANGUAGES`: returned, nothing stored. */
	| { kind: "lang"; language: string }
	/** Returned with the category's fixed line, nothing stored. */
	| { kind: "fixable"; category: FixableCategory }
	/** A half couldn't finish: stored unchecked and re-checked, never placed. */
	| { kind: "unavailable" }
	/** Stored waiting, and may be placed. */
	| { kind: "pass" };

export type LetterCheckDeps = {
	/** The sender's safety: intake's `checkWordsSafety`. Never rejects. */
	safety: (text: string) => Promise<WordsVerdict>;
	/** The letters classifier; `null` when it couldn't answer. Never rejects. */
	classify: (text: string) => Promise<LetterVerdict | null>;
};

/** Contact details or a link, found without a model. */
export function patternCategory(text: string): FixableCategory | null {
	if (contactLeakIn(text)) {
		return "contact";
	}
	if (urlIn(text)) {
		return "link";
	}
	return null;
}

/**
 * The decision, first that applies: risk, held, lang, fixable, unavailable,
 * pass. `verdict` is `null` when the classifier couldn't answer, or wasn't asked
 * because `pattern` already found something to fix.
 *
 * Unavailable when either half couldn't finish, not only both: the safety half
 * guards the sender and the classifier guards the reader, and #750 places
 * nothing a check didn't finish on. A half that did answer still decides what
 * comes before unavailable, so a crisis is never held back behind an outage.
 */
export function decideLetterCheck(input: {
	safety: WordsVerdict;
	verdict: LetterVerdict | null;
	pattern: FixableCategory | null;
}): LetterCheck {
	const { safety, verdict, pattern } = input;
	if (safety.level === "elevated" || safety.level === "crisis") {
		return { kind: "risk", peak: safety.peak ?? null };
	}
	if (verdict?.hostile) {
		return { kind: "held" };
	}
	if (
		verdict &&
		verdict.language !== "und" &&
		!LETTER_LANGUAGES.includes(verdict.language)
	) {
		return { kind: "lang", language: verdict.language };
	}
	const fixable = pattern ?? verdict?.fixable ?? null;
	if (fixable) {
		return { category: fixable, kind: "fixable" };
	}
	if (safety.unavailable || !verdict) {
		return { kind: "unavailable" };
	}
	return { kind: "pass" };
}

/**
 * The whole check over a letter's words. The safety half always runs, so a
 * phone number never hides a sender at risk; the classifier is skipped when the
 * patterns already found something to fix, since the letter is coming back
 * either way and its resend is checked in full.
 */
export async function checkLetterText(
	text: string,
	deps: LetterCheckDeps
): Promise<LetterCheck> {
	const pattern = patternCategory(text);
	const [safety, verdict] = await Promise.all([
		deps.safety(text),
		pattern ? null : deps.classify(text),
	]);
	return decideLetterCheck({ pattern, safety, verdict });
}
