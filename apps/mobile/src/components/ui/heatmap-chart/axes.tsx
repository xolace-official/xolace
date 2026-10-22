import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/src/components/ui/text';
import { cn } from '@/src/lib/cn';
import { DAYS_IN_WEEK, DEFAULT_AXIS_WIDTH, MONTHS, WEEKDAYS } from './constants';
import { useHeatmap, type Slot } from './context';

export interface HeatmapXAxisProps {
  className?: string;
  /**
   * Label a column. Given the first dated bin in it, so a month name can be
   * derived. Return an empty string to leave the column unlabelled.
   */
  formatLabel?: (date: Date, column: number) => string;
  /**
   * Column labels, left to right. Overrides the month names — for a grid whose
   * columns are not weeks, where there is no month to change and so nothing to
   * emit a label on.
   */
  labels?: string[];
}

/**
 * Month labels above the grid.
 *
 * A label is emitted where the month changes rather than at a fixed interval,
 * because months are not the same length — spacing them evenly puts "Mar" over
 * a week in February. A grid whose columns are not weeks has no such signal, so
 * it passes `labels` and gets one over every column.
 */
export function HeatmapXAxis({ className, formatLabel, labels: given }: HeatmapXAxisProps) {
  const { data, grid } = useHeatmap('HeatmapChart.XAxis');
  const step = grid.size + grid.gap;

  const labels = useMemo(() => {
    if (given) {
      return given
        .slice(0, data.length)
        .map((label, column) => ({ column, label }))
        .filter((entry) => entry.label);
    }

    const out: { column: number; label: string }[] = [];
    let lastMonth = -1;

    data.forEach((column, index) => {
      const date = column.bins.find((bin) => bin.date)?.date;
      if (!date) return;
      const month = date.getMonth();
      if (month === lastMonth) return;
      lastMonth = month;
      const label = formatLabel ? formatLabel(date, index) : MONTHS[month]!;
      if (label) out.push({ column: index, label });
    });

    // The first month is usually a stub of a week or two, and a label over it
    // collides with the next one. Drop it when it has no room.
    if (out.length > 1 && out[1]!.column - out[0]!.column < 3) out.shift();
    return out;
  }, [data, formatLabel, given]);

  return (
    <View className={cn('h-4', className)} style={{ width: grid.width }}>
      {labels.map(({ column, label }) => (
        <Text
          key={`${column}-${label}`}
          size="xs"
          muted
          className="absolute"
          style={{ left: column * step }}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}
HeatmapXAxis.slot = 'x-axis' as Slot;

export interface HeatmapYAxisProps {
  className?: string;
  /** Width reserved for the labels. The grid is sized around it. */
  width?: number;
  /** Which rows get a label. Every other row is the usual choice. */
  tickFilter?: 'all' | 'odd' | 'even';
  /** `initial` is the single letter; `full` is the abbreviated name. */
  labelFormat?: 'initial' | 'full';
  /**
   * Row labels, top to bottom. Overrides the weekday names — for a grid whose
   * rows are not days.
   */
  labels?: string[];
}

/** Weekday labels down the left of the grid. */
export function HeatmapYAxis({
  className,
  width = DEFAULT_AXIS_WIDTH,
  tickFilter = 'odd',
  labelFormat = 'full',
  labels,
}: HeatmapYAxisProps) {
  const { grid, weekStartDay } = useHeatmap('HeatmapChart.YAxis');
  const step = grid.size + grid.gap;

  return (
    <View className={className} style={{ width, height: grid.height }}>
      {Array.from({ length: grid.rows }, (_unused, row) => {
        if (tickFilter === 'odd' && row % 2 === 0) return null;
        if (tickFilter === 'even' && row % 2 === 1) return null;

        const name = labels
          ? (labels[row] ?? '')
          : WEEKDAYS[(row + weekStartDay) % DAYS_IN_WEEK]!;
        return (
          <Text
            key={row}
            size="xs"
            muted
            className="absolute"
            // Centred on the cell rather than aligned to its top edge, so a
            // label reads as belonging to the row it sits beside.
            style={{ top: row * step + grid.size / 2 - 7 }}
          >
            {labels
              ? name
              : labelFormat === 'initial'
                ? name.slice(0, 1)
                : name.slice(0, 3)}
          </Text>
        );
      })}
    </View>
  );
}
HeatmapYAxis.slot = 'y-axis' as Slot;
