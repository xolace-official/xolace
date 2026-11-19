import { useEffect } from "react";
import {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";

/** Board `.sp`: rises 104% → 0 in .5 s from .16 s (over 60% of the screen); scrolls past 82%. */
const PANEL = { at: 160, from: 1.04, ms: 500, travel: 0.6 } as const;
export const PANEL_MAX = 0.82;
const EASE = Easing.bezier(0.2, 0.85, 0.25, 1);

/** The step's panel style: it rises once a step opens (fades, with reduced motion). */
export function usePanelRise(open: boolean, reduced: boolean, height: number) {
	const panel = useSharedValue(0);
	useEffect(() => {
		if (!open) {
			return;
		}
		panel.set(
			reduced
				? withTiming(1, { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN })
				: withDelay(
						PANEL.at,
						withTiming(1, {
							duration: PANEL.ms,
							easing: EASE,
							...PLAY_AS_CHOSEN,
						})
					)
		);
	}, [open, reduced, panel]);
	return useAnimatedStyle(() => ({
		opacity: reduced ? panel.get() : 1,
		transform: [
			{
				translateY: reduced
					? 0
					: PANEL.from * height * PANEL.travel * (1 - panel.get()),
			},
		],
	}));
}
