import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { cn } from "@/lib/cn";
import { useOSReduceTransparency } from "@/lib/os-reduce-transparency";

export function Surface({
	radius = 24,
	className,
	style,
	children,
}: {
	radius?: number;
	className?: string;
	style?: StyleProp<ViewStyle>;
	children: ReactNode;
}) {
	const solid = useOSReduceTransparency();
	return (
		<View
			className={cn(
				"border-[0.5px] border-continuous",
				solid ? "border-separator bg-surface" : "border-glass-edge bg-glass",
				className
			)}
			style={[{ borderRadius: radius }, style]}
		>
			{children}
		</View>
	);
}
