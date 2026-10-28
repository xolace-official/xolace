/** Lifts present xolacers to the top. Callers filter by specialty first, so presence is only a
 * tie-break; capacity never enters. Copies, since the input is the reactive query's array. */
export function sortByPresence<T extends { present: boolean }>(
	xolacers: readonly T[]
): T[] {
	return [...xolacers].sort((a, b) => Number(b.present) - Number(a.present));
}
