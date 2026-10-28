// HeatmapChart: a contribution grid, one column per period and one row per bin, composed from
// parts (Header, XAxis, YAxis, Cells, Tooltip, Legend) that take real layout room. Only cells
// are SVG; labels are RN views. The ramp is `--color-chart-1` at five opacities, or `levelColors`.

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
