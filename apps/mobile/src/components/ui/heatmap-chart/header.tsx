import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import type { Slot } from "./context";
import { RampKey } from "./legend";

export interface HeatmapHeaderProps extends ViewProps {
	caption?: string;
	children?: ReactNode;
	className?: string;
	legend?: boolean;
	lessLabel?: string;
	moreLabel?: string;
	title?: string;
	value?: string;
}

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
