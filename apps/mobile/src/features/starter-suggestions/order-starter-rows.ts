import {
	STARTER_ROWS,
	type StarterRow,
	type StarterRowId,
} from "@/features/starter-suggestions/starter-rows";

// Plain strings, not the validator unions: an older build must fall back to
// the default order when a newer backend sends a value it doesn't know.
export type Intake = { intent?: string; emotionAwareness?: string };

const FIRST_BY_INTENT: Record<string, StarterRowId> = {
	feel_less_alone: "xolacer",
	get_through_hard_moment: "vent",
	just_looking: "listen",
	make_it_regular: "reflect",
	understand_feelings: "reflect",
};

const NO_WORDS = new Set([
	"know_but_no_words",
	"something_off_unclear",
	"numb_or_cant_tell",
]);

/** ADR-0017: intake only reorders rows. `intent` picks the first; a no-words `emotionAwareness`
 * sends Reflect last and wins. */
export function orderStarterRows(
	intake: Intake | null | undefined
): StarterRow[] {
	const first = intake?.intent ? FIRST_BY_INTENT[intake.intent] : undefined;
	const reflectLast =
		!!intake?.emotionAwareness && NO_WORDS.has(intake.emotionAwareness);
	const rank = (row: StarterRow) =>
		reflectLast && row.id === "reflect" ? 1 : row.id === first ? -1 : 0;
	// Stable sort: rows of equal rank keep the default order.
	return [...STARTER_ROWS].sort((a, b) => rank(a) - rank(b));
}
