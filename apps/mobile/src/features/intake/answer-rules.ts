/**
 * The two behaviours that go with the question table — kept out of
 * `questions.ts` so that file stays what it says it is: the T1 copy and enums,
 * and nothing that runs.
 */
import { MAX_SELECTIONS } from '@/src/features/intake/questions';

/** Q1's auto-suggested handle: `Camper` and four digits. */
export function suggestHandle(): string {
  return `Camper ${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Holds a multi-select at `MAX_SELECTIONS` by dropping the oldest pick, so a
 * fourth tap answers rather than doing nothing. Mirrored server-side, where
 * `intake.complete` rejects an over-long array outright.
 */
export function applyCap<T extends Record<string, unknown>>(
  answers: T,
  capped: readonly string[]
): T {
  let next = answers;
  for (const name of capped) {
    const value = next[name];
    if (Array.isArray(value) && value.length > MAX_SELECTIONS) {
      next = { ...next, [name]: value.slice(-MAX_SELECTIONS) };
    }
  }
  return next;
}
