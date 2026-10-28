// The one personalized line on the intake offer screen, keyed on Q2 `intent` (T4, #235).
// Only the four committal answers get a line; `just_looking`, `prefer_not_to_say` and a
// missing answer stay static on purpose.
import type { IntakeAnswers } from "@/store/intake-slice";

type Intent = NonNullable<IntakeAnswers["intent"]>;

/** Keyed off the `intent` enum so a renamed validator literal fails to compile here. */
const INTENT_LINE: Partial<Record<Intent, string>> = {
	feel_less_alone: "You came to feel less alone.",
	get_through_hard_moment: "You came to get through something hard.",
	make_it_regular: "You came to make this part of your life.",
	understand_feelings: "You came to understand what you're feeling.",
};

/** `null` for the three non-committal cases, and whenever the arm is control. */
export function intentLine(
	answers: IntakeAnswers,
	personalized: boolean
): string | null {
	if (!personalized) {
		return null;
	}
	const intent = answers.intent;
	return (intent && INTENT_LINE[intent]) || null;
}
