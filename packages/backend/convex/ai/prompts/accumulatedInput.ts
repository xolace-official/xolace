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
  turns: RefinementTurn[],
): string {
  const added = turns
    .filter((t) => (t.userInput ?? "").trim().length > 0)
    .sort((a, b) => a.turnNumber - b.turnNumber);

  if (added.length === 0) return rawInput;

  return [
    `[Original]\n${rawInput}`,
    ...added.map(
      (t) =>
        `${
          SECTION_LABEL[t.userFeedback ?? ""] ?? "[After refinement — free text]"
        }\n${(
          t.userInput as string
        ).trim()}`,
    ),
  ].join("\n\n");
}
