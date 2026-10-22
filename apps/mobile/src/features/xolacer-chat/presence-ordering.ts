/**
 * Lift the xolacers who are in the app right now to the top of a roster list.
 *
 * The caller filters by specialty *before* calling this, which is what makes
 * the constraint structural rather than conventional: the sort only ever sees
 * xolacers who already match what the seeker is carrying, so presence cannot
 * route anyone to someone who doesn't relate to it. Specialty is the primary
 * axis; presence is only the tie-break within it.
 *
 * Capacity deliberately does not enter the sort. A capped xolacer stays where
 * the directory put them — they're already dimmed and labelled "Full right
 * now", and demoting them as well would read as them having vanished.
 *
 * `sort` is stable, so xolacers on the same side of the presence line keep the
 * order the server gave them. Copies rather than sorting in place: the input
 * is the reactive query's array, and mutating it would reorder a value React
 * still considers unchanged.
 */
export function sortByPresence<T extends { present: boolean }>(
  xolacers: readonly T[],
): T[] {
  return [...xolacers].sort(
    (a, b) => Number(b.present) - Number(a.present),
  );
}
