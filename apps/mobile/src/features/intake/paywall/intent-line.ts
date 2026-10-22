/**
 * The one personalized line on the intake offer screen, keyed on Q2 (`intent`)
 * and nothing else (T4, issue #235).
 *
 * Only the four committal answers get a line. `just_looking` and
 * `prefer_not_to_say` — and a missing answer — are deliberately static: someone
 * who declined to say what brought them here has not handed us permission to
 * tell them what they came for.
 */
import type { IntakeAnswers } from '@/src/store/intake-slice';

type Intent = NonNullable<IntakeAnswers['intent']>;

/**
 * Keyed off the `intent` enum rather than `string`: renaming a literal in
 * `intakeAnswerValidators` then fails to compile here, instead of silently
 * dropping the line for everyone who picked it.
 */
const INTENT_LINE: Partial<Record<Intent, string>> = {
  understand_feelings: "You came to understand what you're feeling.",
  get_through_hard_moment: 'You came to get through something hard.',
  feel_less_alone: 'You came to feel less alone.',
  make_it_regular: 'You came to make this part of your life.',
};

/** `null` for the three non-committal cases, and whenever the arm is control. */
export function intentLine(answers: IntakeAnswers, personalized: boolean): string | null {
  if (!personalized) return null;
  const intent = answers.intent;
  return (intent && INTENT_LINE[intent]) || null;
}
