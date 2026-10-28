export function startOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

/**
 * A first-day-of-week index made safe.
 *
 * `weekStartsOn` arrives from a caller and reaches an array index by way of
 * `(day + weekStartsOn) % 7`, where a negative or out-of-range value yields a
 * negative index and an `undefined` weekday name. Both directions wrap.
 */
export function normalizeWeekStart(weekStartsOn: number): number {
	if (!Number.isFinite(weekStartsOn)) {
		return 0;
	}
	return ((Math.trunc(weekStartsOn) % 7) + 7) % 7;
}
