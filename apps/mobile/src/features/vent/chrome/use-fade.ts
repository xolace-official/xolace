import { useEffect } from "react";
import {
	type EasingFunction,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";

export type Fade = {
	inMs: number;
	delayMs?: number;
	outMs: number;
	/** The fade in's curve; `withTiming`'s default when absent. */
	easing?: EasingFunction;
	/** Where it rests when shown (the X dims to .55 while it listens). */
	to?: number;
};

/**
 * The vent's chrome fades (production's opacity timings). Each fade is one the board names, so
 * it plays as chosen: the vent's own Reduce Motion rules decide what moves, not Reanimated.
 */
export function useFade(on: boolean, fade: Fade) {
	const o = useSharedValue(0);
	const { inMs, delayMs = 0, outMs, easing, to = 1 } = fade;
	useEffect(() => {
		if (!on) {
			o.set(withTiming(0, { duration: outMs, ...PLAY_AS_CHOSEN }));
			return;
		}
		// An `easing: undefined` key would throw on the UI thread, so it's left out.
		const config = easing
			? { duration: inMs, easing, ...PLAY_AS_CHOSEN }
			: { duration: inMs, ...PLAY_AS_CHOSEN };
		o.set(
			withDelay(delayMs, withTiming(to, config), PLAY_AS_CHOSEN.reduceMotion)
		);
	}, [on, inMs, delayMs, outMs, easing, to, o]);
	return useAnimatedStyle(() => ({ opacity: o.get() }));
}
