import { type ReactNode, useEffect } from "react";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { EASE_OUT, PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";

/** The old content fades out in 220 ms on ease-in; the new one in over 320 ms, 80 ms in (§11.1). */
export const SWAP = { inAt: 80, inMs: 320, outMs: 220 } as const;
const EASE_IN = Easing.bezier(0.4, 0, 1, 1);

type Props = {
	/** Leaving: absolutely placed at the frame's padding, fading out, hidden from VoiceOver. */
	out: { left: number; right: number; top: number } | null;
	/**
	 * Mounted by a swap: fades in. Every layer after the card's first draw does, so a cold
	 * start that resolves from the skeleton fades its first mode in; a mode known at mount is
	 * simply there.
	 */
	fadeIn: boolean;
	reduced: boolean;
	children: ReactNode;
};

/**
 * One layer of the kindling card's content swap: the frame stays mounted and only what's
 * inside crossfades, the outgoing layer absolutely placed so nothing jumps and the card's
 * height never changes. A layer keeps its instance when it turns outgoing (or back), so
 * each fade starts from the opacity it has. Opacity only; Reduce Motion makes both 200 ms
 * fades.
 */
export function SwapLayer({ out, fadeIn, reduced, children }: Props) {
	const opacity = useSharedValue(fadeIn ? 0 : 1);
	const leaving = out !== null;
	useEffect(() => {
		if (leaving) {
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
		const fade = withTiming(1, {
			duration: reduced ? REDUCED_FADE_MS : SWAP.inMs,
			easing: EASE_OUT,
			...PLAY_AS_CHOSEN,
		});
		opacity.set(reduced ? fade : withDelay(SWAP.inAt, fade));
		// `reduced` is read when a fade starts; a change mid-fade needn't restart it.
	}, [leaving, opacity]);
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
