import { useMemo } from "react";
import { G, Rect, Line as SvgLine } from "react-native-svg";
import { useCSSVariable } from "uniwind";
import { type HeatmapCell, type Slot, useHeatmap } from "./context";

export interface HeatmapCellsProps {
	/** Per-cell override on top of the ramp (a frozen day, today). `undefined` keeps the ramp's
	 * paint. */
	cellStyle?: (cell: HeatmapCell) => HeatmapCellStyle | undefined;
	/** Corner radius of a cell. Falls back to the chart's. */
	cornerRadius?: number;
}

export interface HeatmapCellStyle {
	fill?: string;
	fillOpacity?: number;
	stroke?: string;
	strokeDasharray?: string;
	strokeWidth?: number;
}

/** The grid, every row of every column. Each cell is built lit and dimmed up front; a hold
 * picks one, so only the cells entering and leaving the hold get a new element. */
export function HeatmapCells({ cornerRadius, cellStyle }: HeatmapCellsProps) {
	const chart = useHeatmap("HeatmapChart.Cells");
	const { grid, data, ramp, opacities, levelOf, activeCell, inactiveOpacity } =
		chart;
	const radius = cornerRadius ?? chart.cornerRadius;
	const step = grid.size + grid.gap;

	// Manual on purpose: the compiler folds `cells` into the `activeCell` pick's cache
	// block, which would rebuild every element on every held cell.
	const cells = useMemo(
		() =>
			data.flatMap((column, columnIndex) =>
				Array.from({ length: grid.rows }, (_unused, row) => {
					const bin = column.bins.find((candidate) => candidate.bin === row);
					const count = bin?.count ?? 0;
					const level = levelOf(count);
					const override = cellStyle?.({
						column: columnIndex,
						count,
						date: bin?.date,
						level,
						row,
					});
					const opacity = override?.fillOpacity ?? opacities[level]!;
					// Only the fill dims; an override's outline stays.
					const paint = (fillOpacity: number) => (
						<Rect
							fill={override?.fill ?? ramp[level]}
							fillOpacity={fillOpacity}
							height={grid.size}
							key={`${column.bin}-${row}`}
							rx={radius}
							ry={radius}
							stroke={override?.stroke}
							strokeDasharray={override?.strokeDasharray}
							strokeWidth={override?.strokeWidth}
							width={grid.size}
							x={columnIndex * step}
							y={row * step}
						/>
					);
					const lit = paint(opacity);
					// At an inactive opacity of 1 dimming is a no-op, so a hold re-renders nothing.
					const dim =
						inactiveOpacity === 1 ? lit : paint(opacity * inactiveOpacity);
					return { column: columnIndex, dim, lit, row };
				})
			),
		[
			data,
			grid,
			step,
			levelOf,
			opacities,
			ramp,
			radius,
			cellStyle,
			inactiveOpacity,
		]
	);

	return (
		<G>
			{cells.map((cell) =>
				activeCell === null ||
				(activeCell.column === cell.column && activeCell.row === cell.row)
					? cell.lit
					: cell.dim
			)}
		</G>
	);
}
HeatmapCells.slot = "cells" as Slot;

/* Rules */

export interface HeatmapSeparatorProps {
	color?: string;
	/** Dash pattern, e.g. `"2,4"`. Omit for a solid rule. */
	dashArray?: string;
	/** `quarter` draws a rule every thirteen columns; a number draws one every that many. */
	every?: "quarter" | number;
}

/** Vertical rules grouping the columns — quarters, months, sprints. */
export function HeatmapSeparator({
	every = "quarter",
	color,
	dashArray,
}: HeatmapSeparatorProps) {
	const { grid } = useHeatmap("HeatmapChart.Separator");
	const token = useCSSVariable("--color-border");
	const stroke =
		color ?? (typeof token === "string" ? token : "rgba(128,128,128,0.3)");
	const interval = every === "quarter" ? 13 : every;
	const step = grid.size + grid.gap;

	if (interval <= 0) {
		return null;
	}

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
						stroke={stroke}
						strokeDasharray={dashArray}
						strokeWidth={1}
						x1={x}
						x2={x}
						y1={0}
						y2={grid.height}
					/>
				);
			})}
		</G>
	);
}
HeatmapSeparator.slot = "rules" as Slot;
