import type { ReactNode } from "react";
import type { ViewProps } from "react-native";
import type { ChartAccessibilityProps } from "@/components/ui/chart-accessibility";
import type { HeatmapCell, HeatmapColumn, HeatmapLayout } from "./context";

export interface HeatmapChartProps
	extends Omit<ViewProps, keyof ChartAccessibilityProps<HeatmapCell>>,
		ChartAccessibilityProps<HeatmapCell> {
	/** Milliseconds for the reveal on mount. */
	animationDuration?: number;
	/** Side of one cell in `fluid` layout, in pixels. */
	binSize?: number;
	children?: ReactNode;
	className?: string;
	/** Base colour of the ramp, a literal or a token name like `"--color-chart-3"`. Defaults to
	 * `--color-chart-1`. */
	color?: string;
	/** Corner radius of a cell. */
	cornerRadius?: number;
	/** One column per period, with its row bins inside. */
	data: HeatmapColumn[];
	/** Colour of an empty cell, literal or token name. Defaults to `--color-muted`. */
	emptyColor?: string;
	/** Space between cells, in pixels. */
	gap?: number;
	/** Opacity of every cell that is not the one under the finger. */
	inactiveOpacity?: number;
	/** `fluid` draws cells at `binSize` and grows as wide as needed; `fill` divides the
	 * available width. */
	layout?: HeatmapLayout;
	/** Five colours: empty, then the four levels. Replaces the derived ramp. */
	levelColors?: string[];
	/** Opacity of the base colour at each of the five levels, quietest first. Ignored when
	 * `levelColors` is given. */
	levelOpacity?: number[];
	/** The four counts at which the ramp steps up. Derived from the data's quartiles when
	 * omitted. */
	levels?: number[];
	/** The cell under the finger, `null` when it lifts; for readouts outside the chart. */
	onActiveCellChange?: (cell: HeatmapCell | null) => void;
	/** Rows per column. Seven for a calendar, twenty-four for a grid of hours. */
	rows?: number;
	/** Which weekday is the top row. `0` is Sunday. Labels follow it. */
	weekStartDay?: number;
}
