import { type ReactNode, useEffect, useEffectEvent } from "react";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { EASE_OUT, PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";

export const SWAP = { inAt: 80, inMs: 320, outMs: 220 } as const;
const EASE_IN = Easing.bezier(0.4, 0, 1, 1);

type Props = {
	out: { left: number; right: number; top: number } | null;
	fadeIn: boolean;
	reduced: boolean;
	children: ReactNode;
};

export function SwapLayer({ out, fadeIn, reduced, children }: Props) {
	const opacity = useSharedValue(fadeIn ? 0 : 1);
	const leaving = out !== null;
	const fade = useEffectEvent((out: boolean) => {
		if (out) {
			opacity.set(
				withTiming(0, {
					duration: reduced ? REDUCED_FADE_MS : SWAP.outMs,
					easing: EASE_IN,
					...PLAY_AS_CHOSEN,
				})
			);
			return;
		}
		if (opacity.get() === 1) {
			return;
		}
		const fadeIn = withTiming(1, {
			duration: reduced ? REDUCED_FADE_MS : SWAP.inMs,
			easing: EASE_OUT,
			...PLAY_AS_CHOSEN,
		});
		opacity.set(reduced ? fadeIn : withDelay(SWAP.inAt, fadeIn));
	});
	useEffect(() => {
		fade(leaving);
	}, [leaving]);
	const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

	return (
		<Animated.View
			accessibilityElementsHidden={leaving}
			importantForAccessibility={leaving ? "no-hide-descendants" : "auto"}
			pointerEvents={leaving ? "none" : "auto"}
			style={[out ? { position: "absolute", ...out } : null, style]}
		>
			{children}
		</Animated.View>
	);
}
