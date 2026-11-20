import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "@/features/you/copy";
import { feelingOf } from "@/features/you/moments/moments-model";

export type DayDetail = {
	ended: "lighter" | "same" | "heavier" | null;
	moments: number;
	topDomain: string | null;
	topEmotion: string | null;
};

export type IntensityDay = {
	dayName: string;
	detail?: DayDetail;
	intensity: number | null;
	isToday: boolean;
	label: string;
};

export type Usual = { high: number; low: number; median: number };

export type Relation = "above" | "within" | "below";

export const BAR_MAX = 96;
export const BAR_MIN = 5;
export const PLOT_H = 100;

export const SCALE = [
	{ at: 8.75, label: COPY.week.scale.high },
	{ at: 6.25, label: COPY.week.scale.moderate },
	{ at: 3.75, label: COPY.week.scale.mild },
	{ at: 1.25, label: COPY.week.scale.minimal },
] as const;

export function levelY(value: number): number {
	return (Math.max(0, Math.min(10, value)) / 10) * BAR_MAX;
}

export function barHeight(intensity: number | null): number {
	return intensity === null ? BAR_MIN : Math.max(BAR_MIN, levelY(intensity));
}

export function relationTo(value: number, usual: Usual): Relation {
	if (value > usual.high) {
		return "above";
	}
	if (value < usual.low) {
		return "below";
	}
	return "within";
}

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

const MONTH = new Intl.DateTimeFormat("en-GB", {
	month: "short",
	timeZone: "UTC",
});
const DAY_MS = 86_400_000;
const DAYS_IN_WEEK = 7;
export const MAX_WEEKS_BACK = 52;

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

export function shortDate(start: Date, index: number): string {
	const date = new Date(start.getTime() + index * DAY_MS);
	return `${COPY.week.weekdays[index]} ${date.getUTCDate()} ${MONTH.format(date)}`;
}

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

export type DetailDomain = NonNullable<
	NonNullable<
		FunctionReturnType<
			typeof api.profile.getWeekIntensity
		>["days"][number]["detail"]
	>["topDomain"]
>;

const DOMAINS: Readonly<Record<DetailDomain, string>> = COPY.week.domains;

const isDomain = (key: string): key is DetailDomain =>
	Object.hasOwn(DOMAINS, key);

export const DROP_DOMAIN_ABOVE = 1.1;
export const DROP_FEELING_ABOVE = 1.36;

export function detailLine(
	detail: DayDetail | undefined,
	fontScale = 1
): string | null {
	if (!detail || detail.moments < 1) {
		return null;
	}
	const domain =
		fontScale <= DROP_DOMAIN_ABOVE &&
		detail.topDomain &&
		isDomain(detail.topDomain)
			? DOMAINS[detail.topDomain]
			: null;
	const feeling =
		fontScale <= DROP_FEELING_ABOVE ? feelingOf(null, detail.topEmotion) : null;
	return [
		COPY.week.moments(detail.moments),
		domain,
		feeling,
		detail.ended ? COPY.week.ended[detail.ended] : null,
	]
		.filter(Boolean)
		.join(" · ");
}

export function heldReadout({
	days,
	index,
	start,
	usual,
	todayIndex,
	fontScale = 1,
}: {
	days: readonly IntensityDay[];
	index: number;
	start: Date;
	usual: Usual | null;
	todayIndex: number;
	fontScale?: number;
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
	return {
		caption: detailLine(day.detail, fontScale),
		value: `${date} · ${said}`,
	};
}

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
