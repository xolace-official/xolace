/**
 * This week (you.md §6): production's intensity card, plus "your usual" (B8's band and line),
 * a held day's readout, and a sentence that says something. Pure: the server's week and band
 * in, what to draw and say out.
 */
import { COPY } from "@/features/you/copy";

/** One day as `profile.getWeekIntensity` sends it: Monday first, intensity the day's mean 1–10. */
export type IntensityDay = {
	dayName: string;
	intensity: number | null;
	isToday: boolean;
	label: string;
};

/** `profile.getUsualBand`: the middle half and median of the last four weeks' day averages. */
export type Usual = { high: number; low: number; median: number };

export type Relation = "above" | "within" | "below";

/** The plot. Value 10 reaches `BAR_MAX`, so each quarter of the scale is 24 pt (§6 spacing). */
export const BAR_MAX = 96;
export const BAR_MIN = 5;
/** The bars' box: room above a full bar for "your usual" if the line sits that high. */
export const PLOT_H = 100;

/** The scale labels, each centred on its level (§6). */
export const SCALE = [
	{ at: 8.75, label: COPY.week.scale.high },
	{ at: 6.25, label: COPY.week.scale.moderate },
	{ at: 3.75, label: COPY.week.scale.mild },
	{ at: 1.25, label: COPY.week.scale.minimal },
] as const;

/** Height above the baseline for an intensity (1–10), the unit of bars, band, line and labels. */
export function levelY(value: number): number {
	return (Math.max(0, Math.min(10, value)) / 10) * BAR_MAX;
}

/** A bar's height: a sliver for an empty day, never shorter than `BAR_MIN`. */
export function barHeight(intensity: number | null): number {
	return intensity === null ? BAR_MIN : Math.max(BAR_MIN, levelY(intensity));
}

/** Where a day sits against the band: the range, not the line (decided by the owner). */
export function relationTo(value: number, usual: Usual): Relation {
	if (value > usual.high) {
		return "above";
	}
	if (value < usual.low) {
		return "below";
	}
	return "within";
}

/** The first day with the week's highest intensity, or null on an empty week. */
export function peakIndex(days: readonly IntensityDay[]): number | null {
	let best: number | null = null;
	days.forEach((d, i) => {
		if (d.intensity === null) {
			return;
		}
		if (best === null || d.intensity > (days[best].intensity ?? 0)) {
			best = i;
		}
	});
	return best;
}

/**
 * The line under the chart. Heaviest day and where it sat against your usual, then, if it was
 * above, the first later day back inside the band.
 */
export function weekSentence({
	days,
	usual,
	current,
}: {
	days: readonly IntensityDay[];
	usual: Usual | null;
	current: boolean;
}): string {
	const peak = peakIndex(days);
	if (peak === null) {
		return current ? COPY.week.forming : COPY.week.empty;
	}
	const day = days[peak];
	if (!usual || day.intensity === null) {
		return COPY.week.heaviest(day.dayName);
	}
	const relation = relationTo(day.intensity, usual);
	const head = COPY.week.heaviestAgainst(day.dayName, relation);
	if (relation !== "above") {
		return head;
	}
	const back = days
		.slice(peak + 1)
		.find(
			(d) => d.intensity !== null && relationTo(d.intensity, usual) === "within"
		);
	return back ? `${head} ${COPY.week.backBy(back.dayName)}` : head;
}

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short" });
const DAY_MS = 86_400_000;
const DAYS_IN_WEEK = 7;

/** Monday 00:00 (local) of the week `offset` weeks from the one holding `now`. */
export function weekStart(now: Date, offset: number): Date {
	const monday = new Date(now);
	monday.setHours(0, 0, 0, 0);
	monday.setDate(monday.getDate() - ((monday.getDay() + 6) % DAYS_IN_WEEK));
	monday.setDate(monday.getDate() + offset * DAYS_IN_WEEK);
	return monday;
}

/** "Tue 10 Nov". */
export function shortDate(start: Date, index: number): string {
	const date = new Date(start.getTime() + index * DAY_MS + DAY_MS / 2);
	return `${COPY.week.weekdays[index]} ${date.getDate()} ${MONTH.format(date)}`;
}

/** A held day's two lines, replacing the title row at the same height. */
export function heldReadout({
	days,
	index,
	start,
	usual,
	todayIndex,
}: {
	days: readonly IntensityDay[];
	index: number;
	start: Date;
	usual: Usual | null;
	/** -1 on a past week. */
	todayIndex: number;
}): { value: string; caption: string } {
	const day = days[index];
	const date = shortDate(start, index);
	if (day.intensity === null) {
		const ahead = todayIndex >= 0 && index > todayIndex;
		return {
			caption: ahead ? COPY.week.ahead : COPY.week.none,
			value: date,
		};
	}
	return {
		caption: COPY.week.level(day.intensity),
		value: usual
			? `${date} · ${COPY.week.relation[relationTo(day.intensity, usual)]}`
			: date,
	};
}

/** The plot's spoken label: each day with moments (the sentence under it is read on its own). */
export function weekA11y(
	days: readonly IntensityDay[],
	usual: Usual | null
): string {
	const read = days
		.filter((d) => d.intensity !== null)
		.map((d) =>
			usual && d.intensity !== null
				? `${d.dayName}, ${COPY.week.relation[relationTo(d.intensity, usual)]}`
				: `${d.dayName}, ${COPY.week.level(d.intensity ?? 0)}`
		);
	return [COPY.week.chart, ...read].join(". ");
}
