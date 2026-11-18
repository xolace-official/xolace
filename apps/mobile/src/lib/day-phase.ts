/** The part of the day an hour falls in, which sets a screen's sky, greeting and pace. */
export type DayPhase = "dawn" | "day" | "evening" | "late";

/** Phase windows by hour: dawn 4–9, day 9–17, evening 17–22, late 22–4. */
export const PHASE_HOURS = { dawn: 4, day: 9, evening: 17, late: 22 } as const;

/** The phase an hour (0–23) falls in. */
export function phaseForHour(hour: number): DayPhase {
	if (hour >= PHASE_HOURS.late || hour < PHASE_HOURS.dawn) {
		return "late";
	}
	if (hour < PHASE_HOURS.day) {
		return "dawn";
	}
	if (hour < PHASE_HOURS.evening) {
		return "day";
	}
	return "evening";
}
