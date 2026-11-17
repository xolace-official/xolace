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
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { LT } from "@/features/lantern/lantern-style";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const DIM = { duration: LT.pressMs, easing: LT.press, ...PLAY_AS_CHOSEN };

type Props = Omit<ComponentProps<typeof Pressable>, "style"> & {
	style?: StyleProp<ViewStyle>;
	ref?: Ref<View>;
};

/**
 * Production's row press: it dims to .7 rather than scaling, under Reduce Motion too. A static
 * style, so it works inside `Link asChild` (which drops a Pressable's style function), and the
 * dim runs on the UI thread.
 */
export function DimPress({ style, onPressIn, onPressOut, ...rest }: Props) {
	const o = useSharedValue(1);
	const dim = useAnimatedStyle(() => ({ opacity: o.get() }));
	return (
		<AnimatedPressable
			onPressIn={(e) => {
				o.set(withTiming(LT.rowDim, DIM));
				onPressIn?.(e);
			}}
			onPressOut={(e) => {
				o.set(withTiming(1, DIM));
				onPressOut?.(e);
			}}
			style={[style, dim]}
			{...rest}
		/>
	);
}
