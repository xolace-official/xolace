// Liquid-glass card, ported from sample-codes/clarity-main (ui/glass-surface)
// onto Xolace tokens (#491).

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { useAppTheme } from "@/context/app-theme-context";

// heroui-native's token union only knows built-ins; custom tokens (ember, …) resolve fine at runtime.
const useToken = useThemeColor as (t: string) => string;

// Entrance fade for a surface wrapping GlassSurface. Glass stops rendering
// under an animated opacity, so the fade runs only where there is no glass.
const hasGlass = isLiquidGlassAvailable();
export const FADE_IN = hasGlass ? {} : { opacity: 0 };
export const FADE_OUT = hasGlass ? {} : { opacity: 1 };

// Interactive glass swells past its bounds on press; clipping would shear it.
const unclipped: ViewStyle = { overflow: "visible" };

type SurfaceProps = {
	children?: ReactNode;
	radius?: number;
	className?: string;
	tint?: string;
	/** Native press response. Only for a surface that is itself tappable. */
	interactive?: boolean;
};

/**
 * Frosted surface; `tint` is a token name washed faintly into the glass.
 * Never put it under an animated opacity — the blur stops rendering.
 */
export function GlassSurface({
	children,
	radius = 32,
	className,
	tint,
	interactive,
}: SurfaceProps) {
	const surface = useToken("surface");
	const tintColor = useToken(tint ?? "surface");
	const { isDark } = useAppTheme();
	const shape: ViewStyle = {
		borderCurve: "continuous",
		borderRadius: radius,
		overflow: "hidden",
	};
	// GlassView is third-party, so Uniwind ignores a className on it; style the inside instead.
	const inner = <View className={className}>{children}</View>;
	if (!isLiquidGlassAvailable()) {
		return (
			<View style={[shape, { backgroundColor: surface + "CC" }]}>
				<View style={tint ? { backgroundColor: tintColor + "1A" } : undefined}>
					{inner}
				</View>
			</View>
		);
	}
	return (
		// Follow the app's theme, not the OS: the two can disagree.
		<GlassView
			colorScheme={isDark ? "dark" : "light"}
			glassEffectStyle="regular"
			isInteractive={interactive}
			style={[
				shape,
				interactive && unclipped,
				{ backgroundColor: surface + "40" },
			]}
			tintColor={tint ? tintColor + "33" : undefined}
		>
			{inner}
		</GlassView>
	);
}
