import { useMemo, useState } from 'react';
import { useCSSVariable } from 'uniwind';
import { deriveLevels } from './calendar';
import { isToken, LEVEL_OPACITY } from './constants';
import type { Grid, HeatmapCell } from './context';
import type { HeatmapChartProps } from './props';

type ModelOptions = Required<
  Pick<HeatmapChartProps, 'data' | 'layout' | 'binSize' | 'gap' | 'rows'>
> &
  Pick<
    HeatmapChartProps,
    'levels' | 'levelColors' | 'color' | 'emptyColor' | 'levelOpacity' | 'onActiveCellChange'
  > & {
    /** Width taken by the y-axis beside the grid, in pixels. */
    axisWidth: number;
  };

/** Everything the chart derives from its props: the grid and the ramp. */
export function useHeatmapModel({
  data,
  layout,
  binSize,
  gap,
  rows,
  levels,
  levelColors,
  color,
  emptyColor,
  levelOpacity,
  onActiveCellChange,
  axisWidth,
}: ModelOptions) {
  const [width, setWidth] = useState(0);
  const [activeCell, setActiveCellState] = useState<HeatmapCell | null>(null);

  /*
   * `color` and `emptyColor` take a token name as readily as a literal. A
   * literal is a colour frozen at the moment it was written — it cannot follow
   * the theme into dark mode — so naming the token is almost always what the
   * caller meant, and having to resolve it themselves is the reason they did
   * not. The hooks run unconditionally; which of the two answers is used is
   * decided after.
   */
  const baseToken = useCSSVariable(isToken(color) ? color : '--color-chart-1');
  const emptyToken = useCSSVariable(
    isToken(emptyColor) ? emptyColor : '--color-muted'
  );
  const base =
    (isToken(color) ? undefined : color) ??
    (typeof baseToken === 'string' ? baseToken : '#262626');
  const empty =
    (isToken(emptyColor) ? undefined : emptyColor) ??
    (typeof emptyToken === 'string' ? emptyToken : 'rgba(128,128,128,0.16)');

  const grid = useMemo<Grid>(() => {
    const count = data.length;
    if (!count) return { size: 0, gap, columns: 0, rows, width: 0, height: 0 };

    const available = Math.max(width - axisWidth, 0);
    const size =
      layout === 'fill' && available > 0
        ? Math.max((available - (count - 1) * gap) / count, 1)
        : binSize;

    return {
      size,
      gap,
      columns: count,
      rows,
      width: count * size + (count - 1) * gap,
      height: rows * size + (rows - 1) * gap,
    };
  }, [data.length, width, axisWidth, layout, binSize, gap, rows]);

  const thresholds = useMemo(() => levels ?? deriveLevels(data), [levels, data]);

  /*
   * One colour at five opacities, unless the caller supplied five colours — in
   * which case the opacities are dropped, since dimming a colour someone chose
   * on purpose is not a ramp, it is a bug.
   */
  const { ramp, opacities } = useMemo(
    () =>
      levelColors
        ? { ramp: levelColors, opacities: levelColors.map(() => 1) }
        : {
            ramp: [empty, base, base, base, base],
            opacities: levelOpacity ?? [...LEVEL_OPACITY],
          },
    [levelColors, levelOpacity, empty, base]
  );

  const levelOf = useMemo(
    () => (count: number) => {
      if (count <= 0) return 0;
      let level = 1;
      for (let i = 1; i < thresholds.length; i++) {
        if (count >= thresholds[i]!) level = i + 1;
      }
      return Math.min(level, 4);
    },
    [thresholds]
  );

  const cellAt = useMemo(
    () => (columnIndex: number, row: number): HeatmapCell => {
      const bin = data[columnIndex]?.bins.find((candidate) => candidate.bin === row);
      const count = bin?.count ?? 0;
      return { column: columnIndex, row, count, level: levelOf(count), date: bin?.date };
    },
    [data, levelOf]
  );

  const accessibilityCells = useMemo(
    () =>
      data.flatMap((column) =>
        column.bins.map((bin) => ({
          column: column.bin,
          row: bin.bin,
          count: bin.count,
          level: levelOf(bin.count),
          date: bin.date,
        }))
      ),
    [data, levelOf]
  );

  const setActiveCell = useMemo(
    () => (cell: HeatmapCell | null) => {
      setActiveCellState(cell);
      onActiveCellChange?.(cell);
    },
    [onActiveCellChange]
  );

  return {
    setWidth,
    grid,
    ramp,
    opacities,
    levelOf,
    cellAt,
    accessibilityCells,
    activeCell,
    setActiveCell,
  };
}
