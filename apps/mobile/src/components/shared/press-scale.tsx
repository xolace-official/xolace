import type { ComponentProps, Ref } from "react";
import {
	Pressable,
	type StyleProp,
	type View,
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
	/**
	 * Static styling goes in `className`; `style` is for values computed at
	 * runtime and beats `className`. A function style (`({ pressed }) => …`)
	 * isn't accepted: the animated scale owns the style slot.
	 */
	style?: StyleProp<ViewStyle>;
	/** Cards press to .98, everything else to .96 (the Press curve). */
	card?: boolean;
	/** A specific press scale, when a board names one (Explore's topic tiles: .97). */
	scaleTo?: number;
	/** Plays on press: a named haptic from `@/lib/haptics` or a Pulsar preset. */
	haptic?: () => void;
	ref?: Ref<View>;
};

/**
 * Every tappable thing in the redesign: scales on the Press curve (150 ms), and
 * optionally ticks. With reduced motion it doesn't scale at all. New code uses
 * this, not heroui's `PressableFeedback` (apps/mobile/AGENTS.md, "Shared kit").
 */
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
