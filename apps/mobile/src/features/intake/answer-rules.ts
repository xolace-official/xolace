/** The two behaviours that go with the question table, kept out of `questions.ts` so it stays
 * pure data. */
import { MAX_SELECTIONS } from "@/features/intake/questions";

/** Q1's auto-suggested handle: `Camper` and four digits. */
export function suggestHandle(): string {
	return `Camper ${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Holds a multi-select at `MAX_SELECTIONS` by dropping the oldest pick; `intake.complete`
 * rejects over-long arrays. */
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
