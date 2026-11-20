import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { useResolveClassNames } from "uniwind";
import { cn } from "@/lib/cn";

const SHAPE = "flex-row items-center gap-0.5 rounded-[999px] p-1";

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
