import { COPY } from "./copy";

/** The hour Today keeps: its sky, its greeting and how much it shows. */
export type TodayPhase = "dawn" | "day" | "evening" | "late";

/** Phase windows by hour: dawn 4–9, day 9–17, evening 17–22, late 22–4. */
const PHASE_HOURS = { dawn: 4, day: 9, evening: 17, late: 22 } as const;

/** The phase an hour (0–23) falls in. */
export function phaseForHour(hour: number): TodayPhase {
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

/**
 * Today's phase. Late is the night window with night mode on (`useSessionMode().isNight`,
 * the same 22–4 window), which also puts the app on the night theme; with night mode off
 * those hours stay evening, as the prototype's Night "off" did.
 */
export function todayPhase(hour: number, isNight: boolean): TodayPhase {
	if (isNight) {
		return "late";
	}
	const phase = phaseForHour(hour);
	return phase === "late" ? "evening" : phase;
}

/** The hour the phase next changes after `hour` (0–23), for a timer to wake at. */
export function nextPhaseHour(hour: number): number {
	const bounds = [
		PHASE_HOURS.dawn,
		PHASE_HOURS.day,
		PHASE_HOURS.evening,
		PHASE_HOURS.late,
	];
	return bounds.find((b) => b > hour) ?? PHASE_HOURS.dawn;
}

/** The top row and greeting: "Thursday · evening", "Good evening, Ama". */
export function headerCopy(
	phase: TodayPhase,
	weekday: string,
	name: string | null | undefined
): { eyebrow: string; greeting: string } {
	const trimmed = name?.trim();
	return {
		eyebrow: `${weekday} · ${COPY.partOfDay[phase]}`,
		greeting: COPY.greeting[phase](trimmed ? trimmed : null),
	};
}

/** The first open of the day plays once: the words, the rise, the ink. */
export const introDue = (playedDay: string | null, today: string): boolean =>
	playedDay !== today;

/** The streak as Today last showed it to this user, kept on the device. */
export type SeenStreak = {
	count: number;
	/** The local day the flame last ignited, or null if it never has. */
	ignitedDay: string | null;
};

/**
 * Whether the chip ignites now, and what to keep. It ignites once a day, when the
 * streak has grown since Today last showed it (the first thing that counted today).
 * The first time Today sees a streak it only remembers it: nothing grew on screen.
 */
export function streakStep(
	seen: SeenStreak | null,
	count: number,
	today: string
): { ignite: boolean; next: SeenStreak } {
	if (!seen) {
		return { ignite: false, next: { count, ignitedDay: null } };
	}
	const ignite = count > seen.count && seen.ignitedDay !== today;
	return {
		ignite,
		next: { count, ignitedDay: ignite ? today : seen.ignitedDay },
	};
}

/** The streak as the chip shows it: the count, and a key that grows each time it ignites. */
export type StreakShown = { count: number; day: string; igniteKey: number };

/**
 * The next streak to show when the server's count or the day changes, or null when
 * nothing did. Count and key change in the same step, so the chip sees the new number and
 * the ignite together and rolls the digits (12 → 13) with the flame.
 */
export function nextStreakShown(
	shown: StreakShown | null,
	count: number | undefined,
	day: string,
	seen: () => SeenStreak | null
): { shown: StreakShown; keep: SeenStreak } | null {
	if (count === undefined || (shown?.count === count && shown.day === day)) {
		return null;
	}
	const { ignite, next } = streakStep(seen(), count, day);
	return {
		keep: next,
		shown: {
			count,
			day,
			igniteKey: (shown?.igniteKey ?? 0) + (ignite ? 1 : 0),
		},
	};
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null;

const parse = (raw: string | null): unknown => {
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
};

/**
 * What the device kept for this user: anything stored for another account (signed out,
 * someone else signed in), or not in the shape Today wrote, counts as nothing.
 */
export function parseSeenStreak(
	raw: string | null,
	userId: string
): SeenStreak | null {
	const v = parse(raw);
	if (
		!isRecord(v) ||
		v.userId !== userId ||
		typeof v.count !== "number" ||
		!(v.ignitedDay === null || typeof v.ignitedDay === "string")
	) {
		return null;
	}
	return { count: v.count, ignitedDay: v.ignitedDay };
}

/** The day this user's first open last played, or null. */
export function parseIntroDay(
	raw: string | null,
	userId: string
): string | null {
	const v = parse(raw);
	return isRecord(v) && v.userId === userId && typeof v.day === "string"
		? v.day
		: null;
}

/** Device-local "YYYY-MM-DD". */
export function localDay(now: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
