export function startOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

/** Wraps `weekStartsOn` into 0..6 in both directions, since `(day + weekStartsOn) % 7` goes
 * negative otherwise. */
export function normalizeWeekStart(weekStartsOn: number): number {
	if (!Number.isFinite(weekStartsOn)) {
		return 0;
	}
	return ((Math.trunc(weekStartsOn) % 7) + 7) % 7;
}
