/** Behaviour that goes with the question table, kept out of `questions.ts` so it stays pure
 * data. */
/** Q1's auto-suggested handle: `Camper` and four digits. */
export function suggestHandle(): string {
	return `Camper ${Math.floor(1000 + Math.random() * 9000)}`;
}
