export function startOfDay(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(0, 0, 0, 0);
	return copy;
}

export function normalizeWeekStart(weekStartsOn: number): number {
	if (!Number.isFinite(weekStartsOn)) {
		return 0;
	}
	return ((Math.trunc(weekStartsOn) % 7) + 7) % 7;
}
