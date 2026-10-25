type TimeOfDay =
	| "early_morning"
	| "morning"
	| "afternoon"
	| "evening"
	| "late_night";

/**
 * Determines the time-of-day bucket for the given Date's local hour.
 *
 * @param date - The Date whose local hour will be classified.
 * @returns One of `early_morning`, `morning`, `afternoon`, `evening`, or `late_night`.
 */
export function getTimeOfDay(date: Date): TimeOfDay {
	const hour = date.getHours();
	if (hour >= 5 && hour < 8) {
		return "early_morning";
	}
	if (hour >= 8 && hour < 12) {
		return "morning";
	}
	if (hour >= 12 && hour < 17) {
		return "afternoon";
	}
	if (hour >= 17 && hour < 21) {
		return "evening";
	}
	return "late_night";
}

/**
 * Get the day of the week for the given date.
 *
 * @param date - The date to evaluate
 * @returns The day of the week as a number where 0 = Sunday and 6 = Saturday
 */
export function getDayOfWeek(date: Date): number {
	return date.getDay();
}

/** UTC midnight of the given moment's day — the daily caps' lazy-reset boundary. */
export function startOfTodayUTC(now = new Date()): number {
	return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
