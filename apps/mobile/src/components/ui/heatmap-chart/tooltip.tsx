import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { DEFAULT_HOLD, MONTHS, TOOLTIP_HEIGHT } from "./constants";
import { type HeatmapCell, type Slot, useHeatmap } from "./context";

export interface HeatmapTooltipProps {
	/** Hold before the readout claims the touch; non-zero so a chart in a horizontal scroller
	 * can scroll. */
	activateAfterLongPress?: number;
	className?: string;
	/** The line shown for a cell. Defaults to the count and the date. */
	formatLabel?: (cell: HeatmapCell) => string;
}

/** A readout following the finger, in the view layer over the SVG: gesture handlers cannot
 * attach to SVG nodes and SVG text ignores text scaling. */
export function HeatmapTooltip({
	className,
	formatLabel,
	activateAfterLongPress = DEFAULT_HOLD,
}: HeatmapTooltipProps) {
	const { grid, activeCell, setActiveCell, cellAt } = useHeatmap(
		"HeatmapChart.Tooltip"
	);
	const step = grid.size + grid.gap;

	// Mirrored for the worklet, which cannot read the JS closure's latest value.
	const lastKey = useSharedValue(-1);

	const resolve = useMemo(
		() => (column: number, row: number) => setActiveCell(cellAt(column, row)),
		[cellAt, setActiveCell]
	);
	const clear = useMemo(() => () => setActiveCell(null), [setActiveCell]);

	// Resolved on the UI thread; crosses into JS only when the cell changes.
	const pick = (x: number, y: number) => {
		"worklet";
		const column = Math.floor(x / step);
		const row = Math.floor(y / step);
		if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) {
			return;
		}
		const key = column * grid.rows + row;
		if (key === lastKey.get()) {
			return;
		}
		lastKey.set(key);
		scheduleOnRN(resolve, column, row);
	};

	// `onStart`, not `onBegin`: `onBegin` fires on touch-down, which would light a
	// cell for the first moment of every scroll swipe.
	const pan = Gesture.Pan()
		.minDistance(0)
		.activateAfterLongPress(activateAfterLongPress)
		.onStart((event) => {
			"worklet";
			pick(event.x, event.y);
		})
		.onUpdate((event) => {
			"worklet";
			pick(event.x, event.y);
		})
		.onFinalize(() => {
			"worklet";
			// Fires whether or not the gesture ever activated, so a swipe that only
			// scrolled must not report a cell change it never made.
			if (lastKey.get() === -1) {
				return;
			}
			lastKey.set(-1);
			scheduleOnRN(clear);
		});

	const label = activeCell
		? formatLabel
			? formatLabel(activeCell)
			: defaultTooltipLabel(activeCell)
		: null;

	// Flipped left of the finger past halfway, and dropped below the cell in the top two rows.
	const anchorX = activeCell ? activeCell.column * step + grid.size / 2 : 0;
	const flipped = anchorX > grid.width / 2;
	const below = (activeCell?.row ?? 0) < 2;
	const anchorY = activeCell
		? below
			? activeCell.row * step + grid.size + 6
			: activeCell.row * step - TOOLTIP_HEIGHT - 6
		: 0;

	return (
		<>
			<GestureDetector gesture={pan}>
				<View style={StyleSheet.absoluteFill} />
			</GestureDetector>

			{activeCell && label ? (
				<View
					className={cn(
						"absolute rounded-lg border border-border bg-popover px-2 py-1 shadow-md",
						className
					)}
					pointerEvents="none"
					style={{
						top: anchorY,
						[flipped ? "right" : "left"]: flipped
							? grid.width - anchorX
							: anchorX,
					}}
				>
					<Text className="text-popover-foreground" size="xs">
						{label}
					</Text>
				</View>
			) : null}
		</>
	);
}
HeatmapTooltip.slot = "tooltip" as Slot;

// A cell without a date is a non-calendar cell, not missing data: the count alone is
// the label, and a grid that wants a noun passes `formatLabel`.
function defaultTooltipLabel(cell: HeatmapCell) {
	if (!cell.date) {
		return `${cell.count}`;
	}
	const count = `${cell.count} ${cell.count === 1 ? "contribution" : "contributions"}`;
	const date = `${MONTHS[cell.date.getMonth()]} ${cell.date.getDate()}`;
	return `${count} on ${date}`;
}
