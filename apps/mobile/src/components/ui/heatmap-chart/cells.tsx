import { useMemo } from "react";
import { G, Rect, Line as SvgLine } from "react-native-svg";
import { useCSSVariable } from "uniwind";
import { type HeatmapCell, type Slot, useHeatmap } from "./context";

export interface HeatmapCellsProps {
	cellStyle?: (cell: HeatmapCell) => HeatmapCellStyle | undefined;
	cornerRadius?: number;
}

export interface HeatmapCellStyle {
	fill?: string;
	fillOpacity?: number;
	stroke?: string;
	strokeDasharray?: string;
	strokeWidth?: number;
}

export function HeatmapCells({ cornerRadius, cellStyle }: HeatmapCellsProps) {
	const chart = useHeatmap("HeatmapChart.Cells");
	const { grid, data, ramp, opacities, levelOf, activeCell, inactiveOpacity } =
		chart;
	const radius = cornerRadius ?? chart.cornerRadius;
	const step = grid.size + grid.gap;

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

export interface HeatmapSeparatorProps {
	color?: string;
	dashArray?: string;
	every?: "quarter" | number;
}

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
