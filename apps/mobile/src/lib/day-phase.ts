export type DayPhase = "dawn" | "day" | "evening" | "late";

const PHASE_HOURS = { dawn: 4, day: 9, evening: 17, late: 22 } as const;

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

export function todayPhase(hour: number, isNight: boolean): DayPhase {
	if (isNight) {
		return "late";
	}
	const phase = phaseForHour(hour);
	return phase === "late" ? "evening" : phase;
}

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
