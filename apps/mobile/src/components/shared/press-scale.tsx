import type { ComponentProps, Ref } from "react";
import {
	Pressable,
	type StyleProp,
	type ViewInstance,
	type ViewStyle,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { PRESS, press } from "@/design/springs";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<ComponentProps<typeof Pressable>, "style"> & {
	style?: StyleProp<ViewStyle>;
	card?: boolean;
	scaleTo?: number;
	haptic?: () => void;
	ref?: Ref<ViewInstance>;
};

export function PressScale({
	card,
	scaleTo,
	haptic,
	onPressIn,
	onPressOut,
	onPress,
	style,
	...rest
}: Props) {
	const scale = useSharedValue(1);
	const reduced = useEffectiveReducedMotion();
	const animated = useAnimatedStyle(() => ({
		transform: [{ scale: scale.get() }],
	}));
	const target = scaleTo ?? (card ? PRESS.cardScale : PRESS.scale);

	return (
		<AnimatedPressable
			accessibilityRole="button"
			onPress={(e) => {
				haptic?.();
				onPress?.(e);
			}}
			onPressIn={(e) => {
				if (!reduced) {
					scale.set(press(target, reduced));
				}
				onPressIn?.(e);
			}}
			onPressOut={(e) => {
				scale.set(press(1, reduced));
				onPressOut?.(e);
			}}
			style={[animated, style]}
			{...rest}
		/>
	);
}
