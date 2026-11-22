/**
 * The input a refinement turn is read from: the original text plus every
 * turn's added words, turn-marked (docs/confidence-aware-mirroring.md §5.1).
 *
 * Both the classifier and the articulator read this same base. Two prompts
 * disagreeing about what the person said is one bug in two costumes.
 *
 * Turn-marked, never concatenated: `specificity` measures how sharply the
 * person named the thing, and words volunteered *after* being told the mirror
 * missed are different evidence from what they opened with. The idiom matches
 * the `[Text input]` / `[Voice transcription — …]` framing buildClassifierPrompt
 * already uses.
 */
export interface RefinementTurn {
	turnNumber: number;
	userFeedback?: string;
	userInput?: string;
}

// Each addition declares itself as free text. The entry-type tag at the top of
// the classifier's message describes the ORIGINAL input — on a word-cloud or
// body-scan session it says "tapped, not typed", which would otherwise tell the
// model to read these paragraphs as tapped textures.
const SECTION_LABEL: Record<string, string> = {
	not_quite: '[After "not quite" — free text]',
	say_more: '[After "say more" — free text]',
};

/**
 * @param rawInput - What the person originally submitted.
 * @param turns - The session's refinement turns, any order.
 * @returns The turn-marked accumulated input, or `rawInput` unchanged when no
 *   turn added text (nothing to mark, and the sections would be noise).
 */
export function buildAccumulatedInput(
	rawInput: string,
	turns: RefinementTurn[]
): string {
	const added = turns
		.filter((t) => (t.userInput ?? "").trim().length > 0)
		.sort((a, b) => a.turnNumber - b.turnNumber);

	if (added.length === 0) {
		return rawInput;
	}

	return [
		`[Original]\n${rawInput}`,
		...added.map(
			(t) =>
				`${
					SECTION_LABEL[t.userFeedback ?? ""] ??
					"[After refinement — free text]"
				}\n${(t.userInput as string).trim()}`
		),
	].join("\n\n");
}

/** What a reflection was given: the person's own words and the feeling words they picked. */
export interface EntryInput {
	entryType?: string;
	rawInput?: string;
	textures?: readonly string[];
}

const WORDS_ONLY = "word_cloud";

/**
 * The entry as every AI reader sees it: the classifier, the safeguard's
 * moderation, the memory and exercise embeddings, the mirror and its
 * refinements (B10). Without picked words it is `rawInput`, exactly as before
 * B10. With them, what they wrote and what they picked arrive as two labelled
 * parts of one moment, so no reader mistakes a tapped word for their writing.
 * A words-only entry stored the joined words as `rawInput`; the label says
 * they only picked.
 */
export function entryForAi({
	rawInput = "",
	entryType,
	textures,
}: EntryInput): string {
	if (!textures?.length) {
		return rawInput;
	}
	const picked = `Feeling words they picked: ${textures.join(", ")}`;
	const written = entryType === WORDS_ONLY ? "" : rawInput.trim();
	if (!written) {
		return `They wrote nothing; they only picked feeling words.\n${picked}`;
	}
	const label = entryType === "voice" ? "What they said" : "What they wrote";
	return `${label}:\n${written}\n\n${picked}`;
}

/**
 * Only what the person wrote or said: the one source a "You said" quote may
 * come from. A words-only entry has none, even from builds that sent the
 * picked words as its text.
 */
export const ownWords = ({ rawInput = "", entryType }: EntryInput): string =>
	entryType === WORDS_ONLY ? "" : rawInput;

/** The words a refinement turn added, trimmed; "" when it added none. */
const addedWords = (turn: RefinementTurn): string =>
	(turn.userInput ?? "").trim();

/** Whether any refinement turn added their own words. */
export const wroteInRefinement = (turns: readonly RefinementTurn[]): boolean =>
	turns.some((t) => addedWords(t).length > 0);

/**
 * Characters they actually wrote so far: their entry's own words plus every
 * refinement turn's. Never the labels or the picked words (B10), which the
 * refinement base carries too.
 */
export const writtenSoFar = (
	entry: EntryInput,
	turns: readonly RefinementTurn[]
): number =>
	turns.reduce(
		(chars, t) => chars + addedWords(t).length,
		ownWords(entry).length
	);
