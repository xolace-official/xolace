import { type ReactNode, useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { LETTER_MOTION } from "./letter-motion";

const ROLL = Easing.bezier(...LETTER_MOTION.curves.roll);

type Props = {
	on: boolean;
	reduced: boolean;
	appear?: boolean;
	ms?: number;
	delay?: number;
	rise?: number;
	style?: StyleProp<ViewStyle>;
	className?: string;
	children?: ReactNode;
	hiddenFromA11y?: boolean;
};

export function Fade({
	on,
	reduced,
	appear = false,
	ms = LETTER_MOTION.starters.fadeMs,
	delay = 0,
	rise = 0,
	style,
	className,
	children,
	hiddenFromA11y = true,
}: Props) {
	const shown = useSharedValue(on && !appear ? 1 : 0);
	useEffect(() => {
		const to = on ? 1 : 0;
		const timing = withTiming(to, {
			duration: reduced ? LETTER_MOTION.reducedMs : ms,
			easing: ROLL,
			...PLAY_AS_CHOSEN,
		});
		shown.set(
			on && delay > 0 && !reduced
				? withDelay(delay, timing, PLAY_AS_CHOSEN.reduceMotion)
				: timing
		);
	}, [on, reduced, ms, delay, shown]);
	const lift = reduced ? 0 : rise;
	const animated = useAnimatedStyle(() => ({
		opacity: shown.get(),
		transform: [{ translateY: (1 - shown.get()) * lift }],
	}));
	const hidden = hiddenFromA11y && !on;
	return (
		<Animated.View
			accessibilityElementsHidden={hidden}
			className={className}
			importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
			pointerEvents={on ? "box-none" : "none"}
			style={[style, animated]}
		>
			{children}
		</Animated.View>
	);
}
