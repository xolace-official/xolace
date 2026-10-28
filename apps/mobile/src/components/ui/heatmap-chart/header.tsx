import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import type { Slot } from "./context";
import { RampKey } from "./legend";

export interface HeatmapHeaderProps extends ViewProps {
	/** One muted line under the value — a period, a total, the held cell. */
	caption?: string;
	/** Trailing slot — a control, a badge, a range picker. Wins over `legend`. */
	children?: ReactNode;
	className?: string;
	/** Draw the ramp at the trailing edge: the key for a grid that scrolls sideways. */
	legend?: boolean;
	/** Text at the low end of the ramp, when `legend` is set. */
	lessLabel?: string;
	/** Text at the high end. */
	moreLabel?: string;
	/** Small line above the value — what the grid is of. */
	title?: string;
	/** The readout. The largest thing on the card, and the first thing read. */
	value?: string;
}

/** The strip above the grid: title, readout and ramp key. Pass the value from
 * `onActiveCellChange`. */
export function HeatmapHeader({
	className,
	title,
	value,
	caption,
	legend = false,
	lessLabel = "Less",
	moreLabel = "More",
	children,
	...props
}: HeatmapHeaderProps) {
	const trailing =
		children ??
		(legend ? (
			<View className="flex-row items-center gap-1.5">
				<RampKey
					component="HeatmapChart.Header"
					lessLabel={lessLabel}
					moreLabel={moreLabel}
					// Small enough to sit on one line beside the text, whatever the cells are.
					size={(cell) => Math.max(Math.min(cell, 12), 8)}
				/>
			</View>
		) : null);

	return (
		<View
			{...props}
			className={cn(
				"flex-row items-start justify-between gap-3 pb-3",
				className
			)}
		>
			<View className="flex-1 gap-0.5">
				{title ? (
					<Text muted size="xs">
						{title}
					</Text>
				) : null}
				{value ? (
					<Text size="xl" weight="bold">
						{value}
					</Text>
				) : null}
				{caption ? (
					<Text muted size="xs">
						{caption}
					</Text>
				) : null}
			</View>
			{/* Shrinkable, unlike RN's default, so the caption wraps around the ramp. */}
			{trailing ? <View className="shrink pt-1">{trailing}</View> : null}
		</View>
	);
}
HeatmapHeader.displayName = "HeatmapChart.Header";
HeatmapHeader.slot = "header" as Slot;
