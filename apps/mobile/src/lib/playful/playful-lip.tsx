import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { cn } from "@/lib/utils";
import { PLAYFUL_LIP } from "./use-playful";

/** The Playful lip as its own layer: a slab PLAYFUL_LIP below the face, which sinks onto it
 * while `pressed` is 1. Playful only. */
export function PlayfulLip({
	children,
	className,
	lipClassName,
	pressed,
	radius,
}: {
	children: ReactNode;
	className?: string;
	/** A background utility for the slab, e.g. `bg-accent-lip`. */
	lipClassName: string;
	pressed?: SharedValue<number>;
	radius: number;
}) {
	const face = useAnimatedStyle(() => ({
		transform: [{ translateY: (pressed?.get() ?? 0) * PLAYFUL_LIP }],
	}));
	return (
		<View className={cn("pb-1", className)}>
			<View
				className={cn("absolute right-0 bottom-0 left-0", lipClassName)}
				style={{
					borderCurve: "continuous",
					borderRadius: radius,
					top: PLAYFUL_LIP,
				}}
			/>
			<Animated.View style={face}>{children}</Animated.View>
		</View>
	);
}
