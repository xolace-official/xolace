import { createContext, useContext } from "react";

/** Where a part belongs in the layout, read off the component so children stay a flat list. */
export type Slot =
	| "cells"
	| "x-axis"
	| "y-axis"
	| "rules"
	| "tooltip"
	| "legend"
	| "header";

export type HeatmapLayout = "fluid" | "fill";

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
	count: number;
	date?: Date;
	level: number;
	row: number;
}

export interface Grid {
	columns: number;
	gap: number;
	height: number;
	rows: number;
	/** Side of one cell, in pixels. */
	size: number;
	width: number;
}

export interface HeatmapContextValue {
	activeCell: HeatmapCell | null;
	cellAt: (column: number, row: number) => HeatmapCell;
	cornerRadius: number;
	data: HeatmapColumn[];
	grid: Grid;
	inactiveOpacity: number;
	levelOf: (count: number) => number;
	/** Opacity to paint each level's colour at. All ones for a supplied ramp. */
	opacities: number[];
	/** `[level0, level1, …level4]`, already resolved to colours. */
	ramp: string[];
	setActiveCell: (cell: HeatmapCell | null) => void;
	weekStartDay: number;
}

export const HeatmapContext = createContext<HeatmapContextValue | null>(null);

export function useHeatmap(component: string): HeatmapContextValue {
	const context = useContext(HeatmapContext);
	if (!context) {
		throw new Error(`${component} must be used within a <HeatmapChart>`);
	}
	return context;
}

/** The cell under the finger, for something rendered inside the chart. Outside it, use
 * `onActiveCellChange`. */
export function useHeatmapChart() {
	const { activeCell } = useHeatmap("useHeatmapChart");
	return { activeCell };
}
