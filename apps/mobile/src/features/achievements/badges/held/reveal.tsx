import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import type { Pose } from "@/features/achievements/coin/pose";
import { cn } from "@/lib/cn";

export const NAME_H = 36;

/**
 * A part this badge may not have (a locked one has no date, Share or Pin): kept
 * mounted and hidden by its own wrapper, so switching between earned and locked
 * doesn't re-render what's inside.
 */
export function Part({ on, children }: { on: boolean; children: ReactNode }) {
	return (
		<View
			className={cn("absolute inset-0", !on && "hidden")}
			pointerEvents="box-none"
		>
			{children}
		</View>
	);
}

/** The title grows out of the medallion's label onto its spot, on the x/y/size springs. */
export function Name({
	pose,
	width,
	children,
}: {
	pose: SharedValue<Pose>;
	width: number;
	children: ReactNode;
}) {
	const style = useAnimatedStyle(() => {
		const p = pose.get();
		return {
			opacity: p.alpha * p.nameA,
			transform: [
				{ translateX: p.nx - width / 2 },
				{ translateY: p.ny - NAME_H / 2 },
				{ scale: p.ns },
			],
		};
	});
	return (
		<Animated.View className="absolute top-0 left-0" style={[{ width }, style]}>
			{children}
		</Animated.View>
	);
}

/** One of the page's words or buttons: fades over 240 ms and rises 12 pt over 420 ms, staggered. */
export function Reveal({
	pose,
	i,
	className,
	style,
	children,
}: {
	pose: SharedValue<Pose>;
	i: number;
	/** Its static place (sides, alignment); `style` has the top or bottom. */
	className: string;
	style: StyleProp<ViewStyle>;
	children: ReactNode;
}) {
	const anim = useAnimatedStyle(() => {
		const p = pose.get();
		return {
			opacity: (p.rvA[i] ?? 0) * p.alpha,
			transform: [{ translateY: p.rvY[i] ?? 0 }],
		};
	});
	return (
		<Animated.View className={cn("absolute", className)} style={[style, anim]}>
			{children}
		</Animated.View>
	);
}
