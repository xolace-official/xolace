/**
 * Your days and the streak card's week, from `streaks/history.get`: production's
 * contribution graph (`profile/contribution-graph.ts`), with weeks that start on Monday as
 * the board draws them, so the header's week and the graph's column are the same seven days.
 */
import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "@/features/you/copy";

export type History = FunctionReturnType<typeof api.streaks.history.get>;
type ActionType = History["days"][number]["actions"][number]["type"];
export type CellState = "active" | "missed" | "frozen" | "today" | "future";

/** The grid always draws at least this many weeks from the join week. */
export const MIN_WEEKS = 16;
const DAYS_IN_WEEK = 7;
/** Monday, as `Date.getDay()` counts. */
export const WEEK_START_DAY = 1;

/** Days since this week's Monday: Monday 0 … Sunday 6. */
const weekdayIndex = (date: Date) =>
	(date.getDay() - WEEK_START_DAY + DAYS_IN_WEEK) % DAYS_IN_WEEK;

// Building an Intl.DateTimeFormat is expensive on Hermes (ICU setup), so each
// zone's formatter is made once and reused.
const dayKeyFormats = new Map<string, Intl.DateTimeFormat>();

function dayKeyFormat(timeZone: string): Intl.DateTimeFormat {
	let format = dayKeyFormats.get(timeZone);
	if (!format) {
		// Throws on an invalid zone before caching, so todayIn falls back to UTC.
		format = new Intl.DateTimeFormat("en-CA", {
			day: "2-digit",
			month: "2-digit",
			timeZone,
			year: "numeric",
		});
		dayKeyFormats.set(timeZone, format);
	}
	return format;
}

/** Today in the user's stored timezone, the clock the server keys days with.
 * Derived here because the query's cached result can't see midnight. */
export function todayIn(timezone: string, now = Date.now()): string {
	const format = (timeZone: string) => {
		const parts = dayKeyFormat(timeZone).formatToParts(now);
		const part = (type: string) =>
			parts.find((p) => p.type === type)?.value ?? "";
		return `${part("year")}-${part("month")}-${part("day")}`;
	};
	try {
		return format(timezone);
	} catch {
		return format("UTC");
	}
}

/** "YYYY-MM-DD" → local midnight, the calendar the grid is drawn in. */
export function parseDayKey(dayKey: string): Date {
	const [y = 0, m = 1, d = 1] = dayKey.split("-").map(Number);
	return new Date(y, m - 1, d);
}

export function dayKeyOf(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Join day to the end of the later of this week or the join week's 16th: a new user
 * sees 16 weeks ahead, a longer history ends on today's week. */
export function graphRange(
	joinDay: string,
	today: string
): { start: Date; end: Date } {
	const start = parseDayKey(joinDay);
	const minEnd = new Date(start);
	minEnd.setDate(
		minEnd.getDate() - weekdayIndex(minEnd) + MIN_WEEKS * DAYS_IN_WEEK - 1
	);
	const end = new Date(
		Math.max(parseDayKey(today).getTime(), minEnd.getTime())
	);
	end.setDate(end.getDate() + (DAYS_IN_WEEK - 1 - weekdayIndex(end)));
	return { end, start };
}

/** This week's seven day keys, Monday first. */
export function weekOf(today: string): string[] {
	const monday = parseDayKey(today);
	monday.setDate(monday.getDate() - weekdayIndex(monday));
	return Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
		const day = new Date(monday);
		day.setDate(monday.getDate() + i);
		return dayKeyOf(day);
	});
}

export type IndexedHistory = {
	byDay: Map<string, History["days"][number]>;
	daysShowedUp: number;
	frozen: Set<string>;
	joinDay: string;
	today: string;
};

/** Day lookups by key: the grid asks once per cell. */
export function indexHistory(history: History, today: string): IndexedHistory {
	return {
		byDay: new Map(history.days.map((d) => [d.dayKey, d])),
		daysShowedUp: history.daysShowedUp,
		frozen: new Set(history.frozenDays),
		joinDay: history.joinDay,
		today,
	};
}

export function cellState(dayKey: string, history: IndexedHistory): CellState {
	if (dayKey > history.today) {
		return "future";
	}
	if ((history.byDay.get(dayKey)?.breadth ?? 0) > 0) {
		return "active";
	}
	if (history.frozen.has(dayKey)) {
		return "frozen";
	}
	return dayKey === history.today ? "today" : "missed";
}

// Same output as toLocaleDateString(undefined, …), without a new formatter per call.
const READOUT_DATE = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	weekday: "short",
});

const actionLabel = (type: ActionType) => COPY.days.actions[type];

/** The header: a lifetime count at rest, a held day's breakdown otherwise. */
export function readout(
	dayKey: string | null,
	history: IndexedHistory
): { value: string; caption?: string } {
	if (!dayKey) {
		return { value: COPY.days.showedUp(history.daysShowedUp) };
	}
	const value = READOUT_DATE.format(parseDayKey(dayKey));
	const day = history.byDay.get(dayKey);
	if (day && day.breadth > 0) {
		const caption = day.actions
			.map((a) =>
				a.count > 1 ? `${actionLabel(a.type)} ×${a.count}` : actionLabel(a.type)
			)
			.join(" · ");
		return { caption, value };
	}
	switch (cellState(dayKey, history)) {
		case "frozen":
			return { caption: COPY.days.frozen, value };
		case "future":
			return { caption: COPY.days.ahead, value };
		case "today":
			return { caption: COPY.days.today, value };
		default:
			return { caption: COPY.days.quiet, value };
	}
}

/** One disc of the streak card's week. */
export type WeekDay = {
	dayKey: string;
	letter: string;
	state: "lit" | "frozen" | "quiet" | "future";
	today: boolean;
};

/** The streak card's week, Monday first: lit, frozen, quiet or still ahead. */
export function weekDays(history: IndexedHistory): WeekDay[] {
	return weekOf(history.today).map((dayKey, i) => {
		const state = cellState(dayKey, history);
		return {
			dayKey,
			letter: COPY.streak.letters[i] ?? "",
			state:
				state === "active"
					? "lit"
					: state === "frozen"
						? "frozen"
						: state === "future"
							? "future"
							: "quiet",
			today: dayKey === history.today,
		};
	});
}
