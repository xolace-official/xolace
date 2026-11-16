import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { useResolveClassNames } from "uniwind";
import { cn } from "@/lib/cn";

/** The capsule. 999, not `rounded-full` (9999): GlassView draws its own shape from the radius. */
const SHAPE = "flex-row items-center gap-0.5 rounded-[999px] p-1";

/**
 * Fused glass capsule for toolbar controls. Liquid Glass on iOS 26; a
 * translucent pill elsewhere. Only for chrome that floats over content. The
 * shape is classes, so a caller's `className` (or `style`) overrides it.
 */
export function GlassGroup({
	children,
	style,
	className,
}: {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	className?: string;
}) {
	const glass = isLiquidGlassAvailable();
	// The glass view gets its classes as a style: through withUniwind it drew no glass.
	const resolved = useResolveClassNames(glass ? cn(SHAPE, className) : "");
	if (glass) {
		return (
			<GlassView
				glassEffectStyle="regular"
				isInteractive
				style={[resolved, style]}
			>
				{children}
			</GlassView>
		);
	}
	return (
		<View className={cn(SHAPE, "bg-glass", className)} style={style}>
			{children}
		</View>
	);
}
