import { forwardRef, useMemo } from "react";
import type { ViewInstance } from "react-native";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease";
import { useReducedMotion } from "react-native-reanimated";
import Svg from "react-native-svg";
import { ChartAccessibilityData } from "@/components/ui/chart-accessibility";
import { cn } from "@/lib/cn";
import { DAYS_IN_WEEK, DEFAULT_AXIS_WIDTH } from "./constants";
import { HeatmapContext, type HeatmapContextValue } from "./context";
import { splitParts } from "./parts";
import type { HeatmapChartProps } from "./props";
import { useHeatmapModel } from "./use-heatmap-model";

export const HeatmapChartRoot = forwardRef<ViewInstance, HeatmapChartProps>(
	function HeatmapChartRoot(
		{
			className,
			data,
			layout = "fluid",
			binSize = 12,
			gap = 3,
			cornerRadius = 2,
			weekStartDay = 0,
			rows = DAYS_IN_WEEK,
			levels,
			levelColors,
			color,
			emptyColor,
			levelOpacity,
			animationDuration = 900,
			inactiveOpacity = 1,
			onActiveCellChange,
			accessible,
			accessibilityLabel,
			accessibilityHint,
			accessibilityLabelForDatum,
			onAccessibilityDatumPress,
			children,
			...props
		},
		ref
	) {
		const parts = useMemo(() => splitParts(children), [children]);
		// The y-axis sits beside the grid, so its width comes out of the grid's before the
		// cells are sized.
		const axisWidth = parts.y ? (parts.y.props.width ?? DEFAULT_AXIS_WIDTH) : 0;

		const {
			setWidth,
			grid,
			ramp,
			opacities,
			levelOf,
			cellAt,
			accessibilityCells,
			activeCell,
			setActiveCell,
		} = useHeatmapModel({
			axisWidth,
			binSize,
			color,
			data,
			emptyColor,
			gap,
			layout,
			levelColors,
			levelOpacity,
			levels,
			onActiveCellChange,
			rows,
		});
		const reducedMotion = useReducedMotion();

		const onLayout = (event: LayoutChangeEvent) => {
			const next = event.nativeEvent.layout.width;
			setWidth((current) => (Math.abs(current - next) < 1 ? current : next));
			props.onLayout?.(event);
		};

		const context = useMemo<HeatmapContextValue>(
			() => ({
				activeCell,
				cellAt,
				cornerRadius,
				data,
				grid,
				inactiveOpacity,
				levelOf,
				opacities,
				ramp,
				setActiveCell,
				weekStartDay,
			}),
			[
				data,
				grid,
				ramp,
				opacities,
				levelOf,
				cellAt,
				cornerRadius,
				inactiveOpacity,
				weekStartDay,
				activeCell,
				setActiveCell,
			]
		);

		return (
			<HeatmapContext.Provider value={context}>
				<View
					{...props}
					className={cn("w-full", className)}
					onLayout={onLayout}
					ref={ref}
				>
					{/* Above the axis gutter too: the header is about the whole chart. */}
					{parts.header}

					<ChartAccessibilityData
						accessibilityHint={accessibilityHint}
						accessibilityLabel={accessibilityLabel}
						accessibilityLabelForDatum={accessibilityLabelForDatum}
						chart="Heatmap chart"
						data={accessibilityCells}
						disabled={accessible === false}
						onAccessibilityDatumPress={onAccessibilityDatumPress}
						valueOf={(cell) => [
							["date", cell.date],
							["column", cell.column],
							["row", cell.row],
							["count", cell.count],
						]}
					/>

					{parts.x ? (
						<View
							accessibilityElementsHidden
							importantForAccessibility="no-hide-descendants"
							style={{ paddingLeft: axisWidth }}
						>
							{parts.x}
						</View>
					) : null}

					<View
						accessibilityElementsHidden
						className="flex-row"
						importantForAccessibility="no-hide-descendants"
					>
						{parts.y}
						<View style={{ height: grid.height, width: grid.width }}>
							{grid.width > 0 ? (
								<>
									{/* A native fade, not a width clip: on some TestFlight
									    devices the clip never landed and nothing showed. */}
									<EaseView
										animate={{ opacity: 1 }}
										initialAnimate={{ opacity: 0 }}
										pointerEvents="none"
										style={StyleSheet.absoluteFill}
										transition={{
											duration: reducedMotion ? 0 : animationDuration,
											easing: "easeOut",
											type: "timing",
										}}
									>
										<Svg height={grid.height} width={grid.width}>
											{parts.rules}
											{parts.cells}
										</Svg>
									</EaseView>
									{parts.tooltip}
								</>
							) : null}
						</View>
					</View>

					{parts.legend}
				</View>
			</HeatmapContext.Provider>
		);
	}
);
