import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import type { Pose } from "@/features/achievements/coin/pose";
import { cn } from "@/lib/cn";

export const NAME_H = 36;

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

export function Reveal({
	pose,
	i,
	className,
	style,
	children,
}: {
	pose: SharedValue<Pose>;
	i: number;
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
