import { STARTER_ROWS, type StarterRow, type StarterRowId } from "@/src/features/starter-suggestions/starter-rows";

// Plain strings, not the validator unions: an older build must fall back to
// the default order when a newer backend sends a value it doesn't know.
export type Intake = { intent?: string; emotionAwareness?: string };

const FIRST_BY_INTENT: Record<string, StarterRowId> = {
  understand_feelings: "reflect",
  make_it_regular: "reflect",
  get_through_hard_moment: "vent",
  feel_less_alone: "xolacer",
  just_looking: "listen",
};

const NO_WORDS = new Set(["know_but_no_words", "something_off_unclear", "numb_or_cant_tell"]);

/**
 * ADR-0017: intake may reorder the five rows and nothing else. `intent` picks
 * the first row; a no-words `emotionAwareness` then sends Reflect to the
 * bottom (it wins over intent, so a writing prompt is never first for them).
 * Only these two fields are read.
 */
export function orderStarterRows(intake: Intake | null | undefined): StarterRow[] {
  const first = intake?.intent ? FIRST_BY_INTENT[intake.intent] : undefined;
  const reflectLast = !!intake?.emotionAwareness && NO_WORDS.has(intake.emotionAwareness);
  const rank = (row: StarterRow) =>
    reflectLast && row.id === "reflect" ? 1 : row.id === first ? -1 : 0;
  // Stable sort: rows of equal rank keep the default order.
  return [...STARTER_ROWS].sort((a, b) => rank(a) - rank(b));
}
