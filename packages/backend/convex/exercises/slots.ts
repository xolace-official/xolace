/**
 * Slot values as Sit with this shows them. Every client renders a slot
 * verbatim inside the seed's copy, so the values carry their own grammar,
 * casing and typography: an emotion fits "Something in you is ___.", the
 * mirror line is one sentence, a phrase keeps "I" upright.
 */

const EMOTION_ADJECTIVE: Readonly<Record<string, string>> = {
	anger: "angry",
	anxiety: "anxious",
	calm: "calm",
	confusion: "confused",
	demotivation: "flat",
	disappointment: "disappointed",
	disgust: "disgusted",
	embarrassment: "embarrassed",
	exhaustion: "exhausted",
	fear: "afraid",
	frustration: "frustrated",
	gratitude: "grateful",
	grief: "grieving",
	guilt: "guilty",
	homesickness: "homesick",
	hope: "hopeful",
	hopelessness: "hopeless",
	joy: "glad",
	loneliness: "lonely",
	numbness: "numb",
	overwhelm: "overwhelmed",
	pride: "proud",
	regret: "regretful",
	relief: "relieved",
	sadness: "sad",
	"self-doubt": "doubting itself",
	shame: "ashamed",
	stress: "stressed",
	surprise: "startled",
	uncertainty: "unsure",
};

/** The adjective for a classifier emotion, or undefined when none reads well. */
export function emotionAdjective(emotion: string): string | undefined {
	const key = emotion.trim().toLowerCase();
	return Object.hasOwn(EMOTION_ADJECTIVE, key)
		? EMOTION_ADJECTIVE[key]
		: undefined;
}

const SENTENCE_END = /(?<=[.!?…]["”’)]?)\s+(?=["“‘(]?\p{Lu})/u;

/** The mirror's first sentence, whitespace collapsed. */
export function firstSentence(text: string): string {
	const cleaned = text.replace(/\s+/g, " ").trim();
	return cleaned.split(SENTENCE_END)[0]?.trim() ?? "";
}

const APOSTROPHE = /(\p{L})'(\p{L})/gu;
const DOUBLE_QUOTED = /"([^"]+)"/g;

/** Curly apostrophes and double quotes, as the seed's own copy is set. */
export function typeset(text: string): string {
	return text.replace(APOSTROPHE, "$1’$2").replace(DOUBLE_QUOTED, "“$1”");
}

const LOWER_I = /(^|[^\p{L}'’])i(?=$|[^\p{L}])/gu;

/** A lowercased phrase with "I" upright again and its apostrophes curled. */
export function tidyPhrase(phrase: string): string {
	return typeset(phrase.replace(LOWER_I, "$1I"));
}

const APOSTROPHES = /['’‘`]/g;
const NOT_A_WORD = /[^\p{L}\p{N}]+/gu;

/** Lowercase words only: apostrophes dropped, other punctuation a space. */
function bareWords(text: string): string {
	return text
		.toLowerCase()
		.replace(APOSTROPHES, "")
		.replace(NOT_A_WORD, " ")
		.trim();
}

/**
 * Whether the person wrote or said this phrase themselves, word for word in
 * order, allowing for case and punctuation. A phrase only the mirror used, or
 * one stitched from words they said apart, is not theirs to be quoted as.
 */
export function saidByUser(phrase: string, userText: string): boolean {
	const said = bareWords(phrase);
	return said !== "" && ` ${bareWords(userText)} `.includes(` ${said} `);
}

/**
 * The slots an exercise's steps ask for, once each. A fallback mirror says
 * nothing about the session, so it leaves mirror_line to the seed's default.
 */
export function slotKeysToFill(
	steps: readonly { slotKeys?: readonly string[] }[],
	{ fallbackMirror }: { fallbackMirror: boolean }
): string[] {
	const keys = new Set(steps.flatMap((s) => s.slotKeys ?? []));
	if (fallbackMirror) {
		keys.delete("mirror_line");
	}
	return [...keys];
}
