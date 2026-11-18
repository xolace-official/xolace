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
	/** Shown (1) or not (0). It starts where it is: nothing fades on mount unless `appear`. */
	on: boolean;
	reduced: boolean;
	/** Fade in on mount, from 0. */
	appear?: boolean;
	ms?: number;
	delay?: number;
	/** Rise this far as it comes in (the sent lines: 6 pt). Reduced: none. */
	rise?: number;
	style?: StyleProp<ViewStyle>;
	className?: string;
	children?: ReactNode;
	/** Hidden, it takes no touches and VoiceOver skips it. */
	hiddenFromA11y?: boolean;
};

/**
 * Letters' one fade, on Reanimated (a state change, not a loop): the starters and For as the
 * letter folds, the check's line, the limit, the sent lines. Reduced: 200 ms, no rise.
 */
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
