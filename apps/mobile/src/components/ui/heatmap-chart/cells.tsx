import { useMemo } from 'react';
import { G, Line as SvgLine, Rect } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';
import { useHeatmap, type HeatmapCell, type Slot } from './context';

export interface HeatmapCellsProps {
  /** Corner radius of a cell. Falls back to the chart's. */
  cornerRadius?: number;
  /**
   * Per-cell override on top of the ramp — for cell states the count can't
   * carry (a frozen day, today, the future). Return `undefined` to keep the
   * ramp's paint.
   */
  cellStyle?: (cell: HeatmapCell) => HeatmapCellStyle | undefined;
}

export interface HeatmapCellStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

/**
 * The grid itself. Every row of every column is drawn, including the ones with
 * nothing in them — a calendar with holes in it stops being a calendar.
 *
 * Holding the grid changes `activeCell` once per cell the finger crosses, and
 * the only thing that depends on it is whether a cell is dimmed. So each cell
 * is built twice up front — lit and dimmed — off everything *but* the held
 * cell, and a hold just picks one of the two. Moving from A to B hands React a
 * new element for A and B only; every other cell gets back the exact element
 * it had, and React skips it without diffing a prop.
 */
export function HeatmapCells({ cornerRadius, cellStyle }: HeatmapCellsProps) {
  const chart = useHeatmap('HeatmapChart.Cells');
  const { grid, data, ramp, opacities, levelOf, activeCell, inactiveOpacity } = chart;
  const radius = cornerRadius ?? chart.cornerRadius;
  const step = grid.size + grid.gap;

  // Manual on purpose: the compiler folds `cells` into the same cache block as
  // the `activeCell` pick below (it is only read there), so it would rebuild
  // every element on every held cell and none would ever be reused.
  const cells = useMemo(
    () =>
      data.flatMap((column, columnIndex) =>
        Array.from({ length: grid.rows }, (_unused, row) => {
          const bin = column.bins.find((candidate) => candidate.bin === row);
          const count = bin?.count ?? 0;
          const level = levelOf(count);
          const override = cellStyle?.({ column: columnIndex, row, count, level, date: bin?.date });
          const opacity = override?.fillOpacity ?? opacities[level]!;
          // Only the fill dims. A frozen day's outline is still a frozen day
          // while another one is held.
          const paint = (fillOpacity: number) => (
            <Rect
              key={`${column.bin}-${row}`}
              x={columnIndex * step}
              y={row * step}
              width={grid.size}
              height={grid.size}
              rx={radius}
              ry={radius}
              fill={override?.fill ?? ramp[level]}
              fillOpacity={fillOpacity}
              stroke={override?.stroke}
              strokeWidth={override?.strokeWidth}
              strokeDasharray={override?.strokeDasharray}
            />
          );
          const lit = paint(opacity);
          // At an inactive opacity of 1 dimming is a no-op: one element, and a
          // hold re-renders no cell at all.
          const dim = inactiveOpacity === 1 ? lit : paint(opacity * inactiveOpacity);
          return { column: columnIndex, row, lit, dim };
        })
      ),
    [data, grid, step, levelOf, opacities, ramp, radius, cellStyle, inactiveOpacity]
  );

  return (
    <G>
      {cells.map((cell) =>
        activeCell === null || (activeCell.column === cell.column && activeCell.row === cell.row)
          ? cell.lit
          : cell.dim
      )}
    </G>
  );
}
HeatmapCells.slot = 'cells' as Slot;

/* -------------------------------------------------------------------------- */
/* Rules                                                                      */
/* -------------------------------------------------------------------------- */

export interface HeatmapSeparatorProps {
  /**
   * `quarter` draws a rule every thirteen columns; a number draws one every
   * that many columns.
   */
  every?: 'quarter' | number;
  color?: string;
  /** Dash pattern, e.g. `"2,4"`. Omit for a solid rule. */
  dashArray?: string;
}

/** Vertical rules grouping the columns — quarters, months, sprints. */
export function HeatmapSeparator({ every = 'quarter', color, dashArray }: HeatmapSeparatorProps) {
  const { grid } = useHeatmap('HeatmapChart.Separator');
  const token = useCSSVariable('--color-border');
  const stroke = color ?? (typeof token === 'string' ? token : 'rgba(128,128,128,0.3)');
  const interval = every === 'quarter' ? 13 : every;
  const step = grid.size + grid.gap;

  if (interval <= 0) return null;

  const lines: number[] = [];
  for (let column = interval; column < grid.columns; column += interval) {
    lines.push(column);
  }

  return (
    <G>
      {lines.map((column) => {
        const x = column * step - grid.gap / 2;
        return (
          <SvgLine
            key={column}
            x1={x}
            y1={0}
            x2={x}
            y2={grid.height}
            stroke={stroke}
            strokeWidth={1}
            strokeDasharray={dashArray}
          />
        );
      })}
    </G>
  );
}
HeatmapSeparator.slot = 'rules' as Slot;
