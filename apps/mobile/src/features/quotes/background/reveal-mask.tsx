import MaskedView from "@react-native-masked-view/masked-view";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { revealCircle } from "./reveal-circle";

/**
 * A new background grows out of the bottom in a circle as `reveal` runs 0 → 1, or fades in
 * when `reduced`. iOS masks with a CALayer, which costs nothing per frame. Android draws it in
 * `reveal-mask.android.tsx`.
 */
export function RevealMask({
	reveal,
	reduced,
	width,
	height,
	children,
}: {
	reveal: SharedValue<number>;
	reduced: boolean;
	width: number;
	height: number;
	children: ReactNode;
}) {
	const circle = revealCircle(width, height);
	const mask = useAnimatedStyle(() =>
		reduced
			? { opacity: reveal.get(), transform: [{ scale: 1 }] }
			: { opacity: 1, transform: [{ scale: reveal.get() }] }
	);
	return (
		<MaskedView
			maskElement={
				<Animated.View
					className="absolute bg-black"
					style={[
						{
							borderRadius: circle.radius,
							height: circle.radius * 2,
							left: circle.left,
							top: circle.top,
							width: circle.radius * 2,
						},
						mask,
					]}
				/>
			}
			style={StyleSheet.absoluteFill}
		>
			{children}
		</MaskedView>
	);
}
