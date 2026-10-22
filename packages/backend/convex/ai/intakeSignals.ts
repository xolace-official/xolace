/**
 * Personalization-eligible intake answers (ADR-0014). Only these two of the
 * eleven `intake_responses` fields ever reach a prompt, and only for a
 * user's first session — see `shapeIntakeSignals`.
 */
export interface IntakeSignals {
  disclosureStyle: "all_at_once" | "bit_at_a_time" | "keep_it_brief" | "depends";
  // Omitted entirely (not passed through as a placeholder) when the raw
  // answer was "prefer_not_to_say" — an opt-out means "don't use this."
  emotionAwareness?:
    | "know_and_can_say"
    | "know_but_no_words"
    | "something_off_unclear"
    | "numb_or_cant_tell";
}

/**
 * Shapes a raw `intake_responses` row into the prompt-eligible subset, or
 * `null` when there is no row. Pure and unit-tested in isolation
 * (intakeSignals.test.ts) — the only place the opt-out omission rule lives.
 */
export function shapeIntakeSignals(
  row: {
    disclosureStyle: IntakeSignals["disclosureStyle"];
    emotionAwareness:
      | IntakeSignals["emotionAwareness"]
      | "prefer_not_to_say"
      | undefined;
  } | null
): IntakeSignals | null {
  if (!row) return null;
  return {
    disclosureStyle: row.disclosureStyle,
    ...(row.emotionAwareness && row.emotionAwareness !== "prefer_not_to_say"
      ? { emotionAwareness: row.emotionAwareness }
      : {}),
  };
}
