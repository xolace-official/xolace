import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type History = FunctionReturnType<typeof api.streaks.history.get>;
type ActionType = History["days"][number]["actions"][number]["type"];
export type CellState = "active" | "missed" | "frozen" | "today" | "future";

/** The grid always draws at least this many weeks from the join week. */
export const MIN_WEEKS = 16;

const ACTION_LABELS: Record<ActionType, string> = {
	daily_mood: "Checked in",
	library: "Read",
	quotes: "Held a quote",
	reflect: "Reflected",
	sit_with_this: "Sat with it",
	vent: "Vented",
};

/** Today in the user's stored timezone, the clock the server keys days with.
 * Derived here because the query's cached result can't see midnight. */
export function todayIn(timezone: string, now = Date.now()): string {
	const format = (timeZone: string) => {
		const parts = dayKeyFormat(timeZone).formatToParts(now);
		const part = (type: string) => parts.find((p) => p.type === type)!.value;
		return `${part("year")}-${part("month")}-${part("day")}`;
	};
	try {
		return format(timezone);
	} catch {
		return format("UTC");
	}
}

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

/** "YYYY-MM-DD" → local midnight, the calendar the grid is drawn in. */
export function parseDayKey(dayKey: string): Date {
	const [y, m, d] = dayKey.split("-").map(Number);
	return new Date(y!, m! - 1, d!);
}

export function dayKeyOf(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Join day to the end of the later of the current week or the join week's
 * 16th: a new user sees 16 weeks ahead, a longer history ends on today's week. */
export function graphRange(
	joinDay: string,
	today: string
): { start: Date; end: Date } {
	const start = parseDayKey(joinDay);
	const minEnd = new Date(start);
	minEnd.setDate(minEnd.getDate() - minEnd.getDay() + MIN_WEEKS * 7 - 1);
	const end = new Date(
		Math.max(parseDayKey(today).getTime(), minEnd.getTime())
	);
	end.setDate(end.getDate() + (6 - end.getDay()));
	return { end, start };
}

export type IndexedHistory = ReturnType<typeof indexHistory>;

/** Day lookups by key — the grid asks once per cell, every render. */
export function indexHistory(history: History, today: string) {
	return {
		byDay: new Map(history.days.map((d) => [d.dayKey, d])),
		daysShowedUp: history.daysShowedUp,
		frozen: new Set(history.frozenDays),
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

/** The header: a lifetime count at rest, a held day's breakdown otherwise. */
export function readout(
	dayKey: string | null,
	history: IndexedHistory
): { value: string; caption?: string } {
	if (!dayKey) {
		const n = history.daysShowedUp;
		return { value: `${n} ${n === 1 ? "day" : "days"} showed up` };
	}
	const value = READOUT_DATE.format(parseDayKey(dayKey));
	const day = history.byDay.get(dayKey);
	const state = cellState(dayKey, history);
	if (day) {
		const caption = day.actions
			.map((a) =>
				a.count > 1
					? `${ACTION_LABELS[a.type]} ×${a.count}`
					: ACTION_LABELS[a.type]
			)
			.join(" · ");
		return { caption, value };
	}
	if (state === "frozen") {
		return { caption: "A freeze kept your streak lit", value };
	}
	if (state === "future") {
		return { caption: "Still ahead", value };
	}
	if (state === "today") {
		return { caption: "Nothing yet today", value };
	}
	return { caption: "A quiet day", value };
}
