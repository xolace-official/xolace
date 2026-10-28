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
	/**
	 * Base colour for the derived ramp — the colour the busiest cells are drawn
	 * in, with the quieter levels the same colour at lower opacity.
	 *
	 * Takes a theme token by name as well as a literal, so `"--color-chart-3"`
	 * recolours the chart and keeps following the theme through light and dark.
	 * Defaults to `--color-chart-1`.
	 */
	color?: string;
	/** Corner radius of a cell. */
	cornerRadius?: number;
	/** One column per period, with its row bins inside. */
	data: HeatmapColumn[];
	/**
	 * Colour of a cell with nothing in it. Takes a token name too. Defaults to
	 * `--color-muted`, which is the right weight for "measured, and empty" —
	 * override it for a chart that should read as denser or fainter than that.
	 */
	emptyColor?: string;
	/** Space between cells, in pixels. */
	gap?: number;
	/** Opacity of every cell that is not the one under the finger. */
	inactiveOpacity?: number;
	/**
	 * `fluid` draws cells at `binSize` and lets the grid be as wide as it needs
	 * to be — put it in a horizontal `ScrollView` for a full year. `fill`
	 * divides the available width between the columns instead.
	 */
	layout?: HeatmapLayout;
	/**
	 * Five colours — empty, then the four activity levels. Replaces the derived
	 * ramp outright. Omit it and the ramp is `--color-chart-1` at five
	 * opacities, which follows the theme.
	 */
	levelColors?: string[];
	/**
	 * Opacity of the base colour at each of the five levels, quietest first.
	 * The way to retune the ramp's contrast without having to name five colours.
	 * Ignored when `levelColors` is given, which sets the colours outright.
	 */
	levelOpacity?: number[];
	/**
	 * The four counts at which the ramp steps up. Derived from the data's own
	 * quartiles when omitted, so a chart of single digits and a chart of
	 * thousands both use the whole ramp.
	 */
	levels?: number[];
	/**
	 * The cell under the finger as it moves, and `null` when it lifts. This is
	 * how a readout above the chart gets its value — that readout is outside the
	 * chart, so it cannot use `useHeatmapChart`.
	 */
	onActiveCellChange?: (cell: HeatmapCell | null) => void;
	/**
	 * Rows per column. Seven for a calendar; use another number when the bins
	 * are not weekdays — twenty-four for a grid of hours.
	 */
	rows?: number;
	/** Which weekday is the top row. `0` is Sunday. Labels follow it. */
	weekStartDay?: number;
}
