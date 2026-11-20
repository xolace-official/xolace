import { useRef } from "react";
import {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EX_CURVES, EX_TIMING } from "@/features/explore/explore-style";

const OUT = {
	duration: EX_TIMING.swapOutMs,
	easing: Easing.bezier(...EX_CURVES.swapOut),
	...PLAY_AS_CHOSEN,
};
const FADE_IN = {
	duration: EX_TIMING.swapInMs,
	easing: Easing.bezier(...EX_CURVES.panel),
	...PLAY_AS_CHOSEN,
};
const RISE_IN = {
	duration: EX_TIMING.riseMs,
	easing: Easing.bezier(...EX_CURVES.panel),
	...PLAY_AS_CHOSEN,
};

export function useSwap(beforeIn: () => void, reduced: boolean) {
	const opacity = useSharedValue(1);
	const rise = useSharedValue(0);
	const busy = useRef(false);

	const run = (change: () => void) => {
		if (busy.current) {
			return;
		}
		busy.current = true;
		opacity.set(withTiming(0, OUT));
		setTimeout(() => {
			beforeIn();
			change();
			rise.set(reduced ? 0 : EX_TIMING.rise);
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					opacity.set(withTiming(1, FADE_IN));
					rise.set(withTiming(0, RISE_IN));
					busy.current = false;
				})
			);
		}, EX_TIMING.swapOutMs);
	};

	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ translateY: rise.get() }],
	}));
	return { run, style };
}
