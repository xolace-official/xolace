import { type ReactNode, useEffect, useState } from "react";
import {
	AccessibilityInfo,
	type StyleProp,
	View,
	type ViewStyle,
} from "react-native";
import { cn } from "@/lib/cn";

/** The OS's Reduce Transparency, kept current. */
export function useReduceTransparency(): boolean {
	const [on, setOn] = useState(false);
	useEffect(() => {
		let alive = true;
		AccessibilityInfo.isReduceTransparencyEnabled()
			.then((v) => {
				if (alive) {
					setOn(v);
				}
			})
			.catch(() => undefined);
		const sub = AccessibilityInfo.addEventListener(
			"reduceTransparencyChanged",
			setOn
		);
		return () => {
			alive = false;
			sub.remove();
		};
	}, []);
	return on;
}

/**
 * The board's `.gls` card: the glass tint with a hairline edge. Under Reduce Transparency it's
 * the solid card colour.
 */
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
	const solid = useReduceTransparency();
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
