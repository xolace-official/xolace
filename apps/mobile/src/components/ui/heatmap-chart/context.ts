import { createContext, useContext } from "react";

export type Slot =
	| "cells"
	| "x-axis"
	| "y-axis"
	| "rules"
	| "tooltip"
	| "legend"
	| "header";

export type HeatmapLayout = "fluid" | "fill";

export interface HeatmapBin {
	bin: number;
	count: number;
	date?: Date;
}

export interface HeatmapColumn {
	bin: number;
	bins: HeatmapBin[];
}

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
	opacities: number[];
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

export function useHeatmapChart() {
	const { activeCell } = useHeatmap("useHeatmapChart");
	return { activeCell };
}
