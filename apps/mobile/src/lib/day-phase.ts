/** The part of the day an hour falls in, which sets a screen's sky, greeting and pace. */
export type DayPhase = "dawn" | "day" | "evening" | "late";

/** Phase windows by hour: dawn 4–9, day 9–17, evening 17–22, late 22–4. */
const PHASE_HOURS = { dawn: 4, day: 9, evening: 17, late: 22 } as const;

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

const HOURS_IN_DAY = 24;

/**
 * The phase Today and Explore keep. Late is the night window with night mode on
 * (`useSessionMode().isNight`, the same 22–4 window), which also puts the app on the night
 * theme; with night mode off those hours stay evening, as the prototype's Night "off" did.
 */
export function todayPhase(hour: number, isNight: boolean): DayPhase {
	if (isNight) {
		return "late";
	}
	const phase = phaseForHour(hour);
	return phase === "late" ? "evening" : phase;
}

/**
 * The next hour a screen keeping the phase has to wake at after `hour` (0–23): a phase
 * boundary, or midnight (24) for the weekday and the once-a-day intro.
 */
export function nextWakeHour(hour: number): number {
	const wakes = [
		PHASE_HOURS.dawn,
		PHASE_HOURS.day,
		PHASE_HOURS.evening,
		PHASE_HOURS.late,
		HOURS_IN_DAY,
	];
	return wakes.find((w) => w > hour) ?? HOURS_IN_DAY;
}
