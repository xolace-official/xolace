/**
 * HeatmapChart — a calendar of bins, shaded by how much happened in each.
 *
 * The contribution grid: one column per period (usually a week), one row per
 * bin inside it (usually a weekday), and a colour ramp carrying the count. It
 * answers "when was this busy" at a glance, which no line can — a year of daily
 * numbers plotted as a series is a hairball, and as a grid it is a pattern.
 *
 * Composed rather than configured, so a chart that wants no axis simply does
 * not have one:
 *
 * ```tsx
 * <HeatmapChart data={weeks}>
 *   <HeatmapChart.Header title="Contributions" value="1,204" legend />
 *   <HeatmapChart.YAxis />
 *   <HeatmapChart.XAxis />
 *   <HeatmapChart.Cells />
 *   <HeatmapChart.Tooltip />
 *   <HeatmapChart.Legend />
 * </HeatmapChart>
 * ```
 *
 * The parts sort themselves into a real layout rather than stacking over the
 * plot. That is the difference from a line chart, where the axis floats over
 * the drawing: here the labels and the legend sit *beside* and *below* the
 * grid, so they take up room, and the grid is sized with them accounted for.
 * Only the cells and the rules between them are SVG; every label is a React
 * Native view, because SVG text ignores the platform's text scaling and the
 * theme's font.
 *
 * The ramp is one colour at five opacities rather than five colours. A heatmap
 * reads as *more* and *less* of one thing, and five distinct hues read as five
 * different things — which is what the `--color-chart-*` tokens are for, and
 * why they are not used here. The base is `--color-chart-1`, so the ramp
 * follows the theme, and `levelColors` replaces it outright when a brand needs
 * its own.
 */

import { HeatmapXAxis, HeatmapYAxis } from "./axes";
import { HeatmapCells, HeatmapSeparator } from "./cells";
import { HeatmapHeader } from "./header";
import { HeatmapLegend } from "./legend";
import { HeatmapChartRoot } from "./root";
import { HeatmapTooltip } from "./tooltip";

export type { HeatmapXAxisProps, HeatmapYAxisProps } from "./axes";
export { buildHeatmapCalendar } from "./calendar";
export type {
	HeatmapCellStyle,
	HeatmapCellsProps,
	HeatmapSeparatorProps,
} from "./cells";
export {
	type HeatmapBin,
	type HeatmapCell,
	type HeatmapColumn,
	type HeatmapLayout,
	useHeatmapChart,
} from "./context";
export type { HeatmapHeaderProps } from "./header";
export type { HeatmapLegendProps } from "./legend";
export type { HeatmapChartProps } from "./props";
export type { HeatmapTooltipProps } from "./tooltip";

export const HeatmapChart = Object.assign(HeatmapChartRoot, {
	Cells: HeatmapCells,
	Header: HeatmapHeader,
	Legend: HeatmapLegend,
	Separator: HeatmapSeparator,
	Tooltip: HeatmapTooltip,
	XAxis: HeatmapXAxis,
	YAxis: HeatmapYAxis,
});
