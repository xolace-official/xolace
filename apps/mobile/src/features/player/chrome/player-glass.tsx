import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { cn } from "@/lib/cn";
import { useOSReduceTransparency } from "@/lib/os-reduce-transparency";

const GLASS = isLiquidGlassAvailable();

/**
 * Production's close glass (`CLOSE_GLASS`): clear, dark, interactive, over the artwork whatever
 * the theme. Without Liquid Glass the view gets production's 15% ink fill; Reduce Transparency
 * makes it a solid `--color-player-glass` with a 0.5 pt white ring (§7). Layout comes as a style:
 * through Uniwind a GlassView drew no glass.
 */
export function PlayerGlass({
	style,
	className,
	children,
}: {
	style: StyleProp<ViewStyle>;
	/** For the fallbacks only (padding, alignment). */
	className?: string;
	children: ReactNode;
}) {
	const solid = useOSReduceTransparency();
	if (solid) {
		return (
			<View
				className={cn(
					"border-[0.5px] border-player-ink/20 bg-player-glass",
					className
				)}
				style={style}
			>
				{children}
			</View>
		);
	}
	if (!GLASS) {
		return (
			<View className={cn("bg-player-ink/15", className)} style={style}>
				{children}
			</View>
		);
	}
	return (
		<GlassView
			colorScheme="dark"
			glassEffectStyle="clear"
			isInteractive
			style={style}
		>
			{children}
		</GlassView>
	);
}
