import { createContext, useContext } from 'react';

/**
 * Where a part belongs in the layout. Read off the component itself, so
 * composition stays a flat list of children instead of four nested slots the
 * caller has to remember the order of.
 */
export type Slot = 'cells' | 'x-axis' | 'y-axis' | 'rules' | 'tooltip' | 'legend' | 'header';

export type HeatmapLayout = 'fluid' | 'fill';

/** One bin inside a column — usually a single day. */
export interface HeatmapBin {
  /** Row index within the column, `0` to `6`. */
  bin: number;
  /** How much happened. The ramp is derived from these across the whole chart. */
  count: number;
  /** The day this bin stands for. Used by the axis labels and the tooltip. */
  date?: Date;
}

/** One column — usually a week. Missing bins are drawn as empty cells. */
export interface HeatmapColumn {
  /** Column index across the chart. */
  bin: number;
  bins: HeatmapBin[];
}

/** A cell resolved to its place in the grid, as the tooltip receives it. */
export interface HeatmapCell {
  column: number;
  row: number;
  count: number;
  level: number;
  date?: Date;
}

export interface Grid {
  /** Side of one cell, in pixels. */
  size: number;
  gap: number;
  columns: number;
  rows: number;
  width: number;
  height: number;
}

export interface HeatmapContextValue {
  data: HeatmapColumn[];
  grid: Grid;
  /** `[level0, level1, …level4]`, already resolved to colours. */
  ramp: string[];
  /** Opacity to paint each level's colour at. All ones for a supplied ramp. */
  opacities: number[];
  levelOf: (count: number) => number;
  cellAt: (column: number, row: number) => HeatmapCell;
  cornerRadius: number;
  inactiveOpacity: number;
  weekStartDay: number;
  activeCell: HeatmapCell | null;
  setActiveCell: (cell: HeatmapCell | null) => void;
}

export const HeatmapContext = createContext<HeatmapContextValue | null>(null);

export function useHeatmap(component: string): HeatmapContextValue {
  const context = useContext(HeatmapContext);
  if (!context) {
    throw new Error(`${component} must be used within a <HeatmapChart>`);
  }
  return context;
}

/**
 * The cell under the finger, for something rendered *inside* the chart. A
 * readout in the card's header is outside this provider — use
 * `onActiveCellChange` for that.
 */
export function useHeatmapChart() {
  const { activeCell } = useHeatmap('useHeatmapChart');
  return { activeCell };
}
