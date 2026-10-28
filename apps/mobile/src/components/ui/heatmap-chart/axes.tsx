import { useMemo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import {
	DAYS_IN_WEEK,
	DEFAULT_AXIS_WIDTH,
	MONTHS,
	WEEKDAYS,
} from "./constants";
import { type Slot, useHeatmap } from "./context";

export interface HeatmapXAxisProps {
	className?: string;
	/** Label a column from its first dated bin. Return an empty string to leave it unlabelled. */
	formatLabel?: (date: Date, column: number) => string;
	/** Column labels, left to right, overriding month names for a grid whose columns are not
	 * weeks. */
	labels?: string[];
}

/** Month labels above the grid, emitted where the month changes; `labels` gives one per column
 * instead. */
export function HeatmapXAxis({
	className,
	formatLabel,
	labels: given,
}: HeatmapXAxisProps) {
	const { data, grid } = useHeatmap("HeatmapChart.XAxis");
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
			if (!date) {
				return;
			}
			const month = date.getMonth();
			if (month === lastMonth) {
				return;
			}
			lastMonth = month;
			const label = formatLabel ? formatLabel(date, index) : MONTHS[month]!;
			if (label) {
				out.push({ column: index, label });
			}
		});

		// The first month is usually a stub and its label collides with the next; drop it when
		// cramped.
		if (out.length > 1 && out[1]!.column - out[0]!.column < 3) {
			out.shift();
		}
		return out;
	}, [data, formatLabel, given]);

	return (
		<View className={cn("h-4", className)} style={{ width: grid.width }}>
			{labels.map(({ column, label }) => (
				<Text
					className="absolute"
					key={`${column}-${label}`}
					muted
					size="xs"
					style={{ left: column * step }}
				>
					{label}
				</Text>
			))}
		</View>
	);
}
HeatmapXAxis.slot = "x-axis" as Slot;

export interface HeatmapYAxisProps {
	className?: string;
	/** `initial` is the single letter; `full` is the abbreviated name. */
	labelFormat?: "initial" | "full";
	/** Row labels, top to bottom, overriding weekday names for a grid whose rows are not days. */
	labels?: string[];
	/** Which rows get a label. Every other row is the usual choice. */
	tickFilter?: "all" | "odd" | "even";
	/** Width reserved for the labels. The grid is sized around it. */
	width?: number;
}

/** Weekday labels down the left of the grid. */
export function HeatmapYAxis({
	className,
	width = DEFAULT_AXIS_WIDTH,
	tickFilter = "odd",
	labelFormat = "full",
	labels,
}: HeatmapYAxisProps) {
	const { grid, weekStartDay } = useHeatmap("HeatmapChart.YAxis");
	const step = grid.size + grid.gap;

	return (
		<View className={className} style={{ height: grid.height, width }}>
			{Array.from({ length: grid.rows }, (_unused, row) => {
				if (tickFilter === "odd" && row % 2 === 0) {
					return null;
				}
				if (tickFilter === "even" && row % 2 === 1) {
					return null;
				}

				const name = labels
					? (labels[row] ?? "")
					: WEEKDAYS[(row + weekStartDay) % DAYS_IN_WEEK]!;
				return (
					<Text
						className="absolute"
						key={row}
						muted
						size="xs"
						// Centred on the cell so the label reads as belonging to its row.
						style={{ top: row * step + grid.size / 2 - 7 }}
					>
						{labels
							? name
							: labelFormat === "initial"
								? name.slice(0, 1)
								: name.slice(0, 3)}
					</Text>
				);
			})}
		</View>
	);
}
HeatmapYAxis.slot = "y-axis" as Slot;
