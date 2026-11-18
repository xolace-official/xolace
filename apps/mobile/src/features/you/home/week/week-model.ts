/**
 * This week (you.md §6): production's intensity card, plus "your usual" (B8's band and line),
 * a held day's readout, and a sentence that says something. Pure: the server's week and band
 * in, what to draw and say out.
 */
import { COPY } from "@/features/you/copy";
import { feelingOf } from "@/features/you/moments/moments-model";

/**
 * What a held day says under its date (the board's "2 moments · Work · Overwhelmed · ended
 * lighter"): `getWeekIntensity({ withDetail: true })`'s per-day detail (backend B17). Only on
 * days with moments; missing from a backend without it, and then nothing draws a second line.
 */
export type DayDetail = {
	/** How the day's last moment ended; null when it wasn't answered. */
	ended: "lighter" | "same" | "heavier" | null;
	moments: number;
	/** A steadiness domain key ("work"), or null. */
	topDomain: string | null;
	/** The classifier's word ("overwhelm"), or null. */
	topEmotion: string | null;
};

/** One day as `profile.getWeekIntensity` sends it: Monday first, intensity the day's mean 1–10. */
export type IntensityDay = {
	dayName: string;
	/** B17's per-day detail, asked for with `withDetail`. */
	detail?: DayDetail;
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

/** The server's days are UTC days, so the dates under them are UTC dates too. */
const MONTH = new Intl.DateTimeFormat("en-GB", {
	month: "short",
	timeZone: "UTC",
});
const DAY_MS = 86_400_000;
const DAYS_IN_WEEK = 7;
/** How far back Xolace+ can page (`MAX_WEEKS_BACK` in `profile.getWeekIntensity`). */
export const MAX_WEEKS_BACK = 52;

/**
 * Monday 00:00 UTC of the week `offset` weeks from the one holding `now`. UTC because
 * `profile.getWeekIntensity` cuts its weeks, days and `isToday` on the Convex runtime's clock,
 * which is UTC, whatever the device's time zone.
 */
export function weekStart(now: Date, offset: number): Date {
	const monday = new Date(now);
	monday.setUTCHours(0, 0, 0, 0);
	monday.setUTCDate(
		monday.getUTCDate() -
			((monday.getUTCDay() + 6) % DAYS_IN_WEEK) +
			offset * DAYS_IN_WEEK
	);
	return monday;
}

/** "Tue 10 Nov", the UTC date of day `index` of the week from `start`. */
export function shortDate(start: Date, index: number): string {
	const date = new Date(start.getTime() + index * DAY_MS);
	return `${COPY.week.weekdays[index]} ${date.getUTCDate()} ${MONTH.format(date)}`;
}

/** The day under a finger `x` pt into a plot `width` wide; null before layout. */
export function dayAt(x: number, width: number): number | null {
	"worklet";
	if (width <= 0) {
		return null;
	}
	return Math.max(
		0,
		Math.min(DAYS_IN_WEEK - 1, Math.floor((x / width) * DAYS_IN_WEEK))
	);
}

/**
 * The week an arrow asks for, paged from the week on screen (not the last one asked for, so
 * taps while the next week loads don't run past the end): never later than this week, never
 * earlier than the earliest.
 */
export function pagedOffset({
	shown,
	by,
	earliest,
}: {
	shown: number;
	by: -1 | 1;
	earliest: boolean;
}): number {
	if (by < 0 && earliest) {
		return shown;
	}
	return Math.max(-MAX_WEEKS_BACK, Math.min(0, shown + by));
}

const DOMAINS: Readonly<Record<string, string>> = COPY.steadiness.domains;

/**
 * A held day's second line, from B17's detail: "2 moments · Work & Studies · Overwhelm · ended
 * lighter". Each part only when the day says it, so a day of unanswered moments is "1 moment ·
 * Work & Studies". Null with no detail (a backend without B17) or no moments. The feeling is worded
 * as Moments words it (`feelingOf`), so a day and its moments agree.
 */
export function detailLine(detail: DayDetail | undefined): string | null {
	if (!detail || detail.moments < 1) {
		return null;
	}
	const domain =
		detail.topDomain && Object.hasOwn(DOMAINS, detail.topDomain)
			? DOMAINS[detail.topDomain]
			: null;
	return [
		COPY.week.moments(detail.moments),
		domain,
		feelingOf(null, detail.topEmotion),
		detail.ended ? COPY.week.ended[detail.ended] : null,
	]
		.filter(Boolean)
		.join(" · ");
}

/**
 * A held day's readout in place of the title row: "Tue 10 Nov · above your usual", and under it
 * `caption`, B17's line (`detailLine`), or null when there's none to draw.
 */
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
}): { caption: string | null; value: string } {
	const day = days[index];
	const date = shortDate(start, index);
	if (day.intensity === null) {
		const ahead = todayIndex >= 0 && index > todayIndex;
		return {
			caption: null,
			value: `${date} · ${ahead ? COPY.week.ahead : COPY.week.none}`,
		};
	}
	const said = usual
		? COPY.week.relation[relationTo(day.intensity, usual)]
		: COPY.week.level(day.intensity);
	return { caption: detailLine(day.detail), value: `${date} · ${said}` };
}

/**
 * The plot's spoken label: every day, today named, empty days read too, so an empty week is
 * more than its title (the sentence under it is read on its own).
 */
export function weekA11y(
	days: readonly IntensityDay[],
	usual: Usual | null
): string {
	const todayIndex = days.findIndex((d) => d.isToday);
	const read = days.map((d, i) => {
		const name = d.isToday ? `${d.dayName}, ${COPY.week.today}` : d.dayName;
		if (d.intensity === null) {
			const ahead = todayIndex >= 0 && i > todayIndex;
			return `${name}, ${ahead ? COPY.week.ahead : COPY.week.none}`;
		}
		return `${name}, ${
			usual
				? COPY.week.relation[relationTo(d.intensity, usual)]
				: COPY.week.level(d.intensity)
		}`;
	});
	return [COPY.week.chart, ...read].join(". ");
}
