import type { ReactNode } from "react";
import type { ViewProps } from "react-native";
import type { ChartAccessibilityProps } from "@/components/ui/chart-accessibility";
import type { HeatmapCell, HeatmapColumn, HeatmapLayout } from "./context";

export interface HeatmapChartProps
	extends Omit<ViewProps, keyof ChartAccessibilityProps<HeatmapCell>>,
		ChartAccessibilityProps<HeatmapCell> {
	animationDuration?: number;
	binSize?: number;
	children?: ReactNode;
	className?: string;
	color?: string;
	cornerRadius?: number;
	data: HeatmapColumn[];
	emptyColor?: string;
	gap?: number;
	inactiveOpacity?: number;
	layout?: HeatmapLayout;
	levelColors?: string[];
	levelOpacity?: number[];
	levels?: number[];
	onActiveCellChange?: (cell: HeatmapCell | null) => void;
	rows?: number;
	weekStartDay?: number;
}
