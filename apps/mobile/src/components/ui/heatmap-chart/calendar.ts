import { normalizeWeekStart, startOfDay } from '@/src/lib/date';
import { DAYS_IN_WEEK } from './constants';
import type { HeatmapBin, HeatmapColumn } from './context';

/**
 * Build a year of columns from a flat list of dated counts.
 *
 * Every heatmap starts as "I have some dates and some numbers", and the
 * bucketing into weeks is the same arithmetic every time — including the two
 * parts that are easy to get wrong: the leading blanks before the first day of
 * the first week, and days with no entry at all, which must still be drawn as
 * empty cells or the calendar develops holes.
 */
export function buildHeatmapCalendar(
  entries: { date: Date; count: number }[],
  options: { start?: Date; end?: Date; weekStartDay?: number } = {}
): HeatmapColumn[] {
  const weekStartDay = normalizeWeekStart(options.weekStartDay ?? 0);
  if (!entries.length && !options.start) return [];

  const times = entries.map((entry) => entry.date.getTime());
  // Both bounds at local midnight, and both the same way. Comparing a
  // normalised lower bound against a raw upper one drops the last day whenever
  // the caller's `end` carries a time earlier than the cell being tested.
  const start = startOfDay(options.start ?? new Date(Math.min(...times)));
  const end = startOfDay(options.end ?? new Date(Math.max(...times)));

  const byDay = new Map<string, number>();
  for (const entry of entries) {
    const key = dayKey(entry.date);
    byDay.set(key, (byDay.get(key) ?? 0) + entry.count);
  }

  // Back up to the first day of the week the range starts in, so column 0 is a
  // whole week and every row lines up with a weekday for the rest of the chart.
  const cursor = startOfDay(start);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() - weekStartDay + 7) % 7));

  const columns: HeatmapColumn[] = [];
  let column: HeatmapBin[] = [];

  while (cursor <= end || column.length) {
    const row = (cursor.getDay() - weekStartDay + 7) % 7;
    const date = new Date(cursor);
    // Before the range starts and after it ends the cell exists but has no
    // reading — `count: 0` and no date, so the tooltip stays quiet on it.
    const inRange = date >= start && date <= end;
    column.push({
      bin: row,
      count: inRange ? (byDay.get(dayKey(date)) ?? 0) : 0,
      date: inRange ? date : undefined,
    });

    if (row === DAYS_IN_WEEK - 1) {
      columns.push({ bin: columns.length, bins: column });
      column = [];
      if (cursor > end) break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Four thresholds from the data, so a chart of single-digit counts and a chart
 * of thousands both use the whole ramp. Quartiles of the *non-zero* counts:
 * zero is its own level, and counting it would drag every threshold down to
 * nothing on a sparse chart.
 */
export function deriveLevels(data: HeatmapColumn[]): number[] {
  const counts: number[] = [];
  for (const column of data) {
    for (const bin of column.bins) {
      if (bin.count > 0) counts.push(bin.count);
    }
  }
  if (!counts.length) return [1, 2, 3, 4];
  counts.sort((a, b) => a - b);
  const at = (fraction: number) =>
    counts[Math.min(counts.length - 1, Math.floor(counts.length * fraction))]!;
  const thresholds = [1, at(0.25), at(0.5), at(0.75)];
  // Ties collapse the ramp — nudge each threshold past the one below it so
  // four distinct levels stay four distinct levels.
  for (let i = 1; i < thresholds.length; i++) {
    if (thresholds[i]! <= thresholds[i - 1]!) thresholds[i] = thresholds[i - 1]! + 1;
  }
  return thresholds;
}
