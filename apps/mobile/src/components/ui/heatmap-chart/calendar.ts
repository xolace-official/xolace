import { normalizeWeekStart, startOfDay } from "@/lib/date";
import { DAYS_IN_WEEK } from "./constants";
import type { HeatmapBin, HeatmapColumn } from "./context";

/** A year of columns from dated counts, with leading blanks and empty cells for days with no
 * entry. */
export function buildHeatmapCalendar(
	entries: { date: Date; count: number }[],
	options: { start?: Date; end?: Date; weekStartDay?: number } = {}
): HeatmapColumn[] {
	const weekStartDay = normalizeWeekStart(options.weekStartDay ?? 0);
	if (!(entries.length || options.start)) {
		return [];
	}

	const times = entries.map((entry) => entry.date.getTime());
	// Both bounds at local midnight, or an `end` with an earlier time drops the last day.
	const start = startOfDay(options.start ?? new Date(Math.min(...times)));
	const end = startOfDay(options.end ?? new Date(Math.max(...times)));

	const byDay = new Map<string, number>();
	for (const entry of entries) {
		const key = dayKey(entry.date);
		byDay.set(key, (byDay.get(key) ?? 0) + entry.count);
	}

	// Back up to the first day of the week so column 0 is whole and rows line up with weekdays.
	const cursor = startOfDay(start);
	cursor.setDate(cursor.getDate() - ((cursor.getDay() - weekStartDay + 7) % 7));

	const columns: HeatmapColumn[] = [];
	let column: HeatmapBin[] = [];

	while (cursor <= end || column.length) {
		const row = (cursor.getDay() - weekStartDay + 7) % 7;
		const date = new Date(cursor);
		// Outside the range the cell exists but has no date, so the tooltip stays quiet on it.
		const inRange = date >= start && date <= end;
		column.push({
			bin: row,
			count: inRange ? (byDay.get(dayKey(date)) ?? 0) : 0,
			date: inRange ? date : undefined,
		});

		if (row === DAYS_IN_WEEK - 1) {
			columns.push({ bin: columns.length, bins: column });
			column = [];
			if (cursor > end) {
				break;
			}
		}
		cursor.setDate(cursor.getDate() + 1);
	}

	return columns;
}

function dayKey(date: Date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Four thresholds from the quartiles of the non-zero counts, so any scale uses the whole ramp. */
export function deriveLevels(data: HeatmapColumn[]): number[] {
	const counts: number[] = [];
	for (const column of data) {
		for (const bin of column.bins) {
			if (bin.count > 0) {
				counts.push(bin.count);
			}
		}
	}
	if (!counts.length) {
		return [1, 2, 3, 4];
	}
	counts.sort((a, b) => a - b);
	const at = (fraction: number) =>
		counts[Math.min(counts.length - 1, Math.floor(counts.length * fraction))]!;
	const thresholds = [1, at(0.25), at(0.5), at(0.75)];
	// Ties collapse the ramp: nudge each threshold past the one below it.
	for (let i = 1; i < thresholds.length; i++) {
		if (thresholds[i]! <= thresholds[i - 1]!) {
			thresholds[i] = thresholds[i - 1]! + 1;
		}
	}
	return thresholds;
}
