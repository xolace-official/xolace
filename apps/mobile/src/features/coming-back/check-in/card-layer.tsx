import { type ReactNode, useEffect } from "react";
import type { LayoutChangeEvent } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";

/** Board `.stk`: each card runs 30 under the next; `.vrow` 74 (the least a layer drops by). */
export const OVERLAP = 30;
export const VENT_H = 74;
export const TOP_ROUND = "rounded-t-[34px] border-continuous";

/** Board `cardUp .5s` from 60, `220ms + 60ms × i`; on a pick the rest drop 130% (380 ms, staggered 40), the chosen lifts −70 to .94 (360 ms, fade from 80). */
const RISE = {
	at: 220,
	ease: Easing.bezier(0.2, 0.85, 0.25, 1),
	from: 60,
	ms: 500,
	stagger: 60,
} as const;
const DROP = {
	by: 1.3,
	ease: Easing.bezier(0.4, 0, 0.6, 1),
	fadeMs: 300,
	ms: 380,
	stagger: 40,
} as const;
const LIFT = {
	by: -70,
	ease: Easing.bezier(0.2, 0.85, 0.25, 1),
	fadeAt: 80,
	fadeMs: 260,
	ms: 360,
	scale: 0.94,
} as const;

type LayerProps = {
	j: number;
	picked: boolean;
	chosen: boolean;
	reduced: boolean;
	children: ReactNode;
};

/** One layer of the stack: rises in, then drops away (or lifts, if chosen) on a pick. */
export function Layer({ j, picked, chosen, reduced, children }: LayerProps) {
	const y = useSharedValue(reduced ? 0 : RISE.from);
	const opacity = useSharedValue(reduced ? 1 : 0);
	const scale = useSharedValue(1);
	const h = useSharedValue(0);

	useEffect(() => {
		if (reduced) {
			return;
		}
		const at = RISE.at + RISE.stagger * j;
		const t = { duration: RISE.ms, easing: RISE.ease, ...PLAY_AS_CHOSEN };
		y.set(withDelay(at, withTiming(0, t)));
		opacity.set(withDelay(at, withTiming(1, t)));
	}, [j, reduced, y, opacity]);

	useEffect(() => {
		if (!picked) {
			return;
		}
		if (reduced) {
			opacity.set(
				withTiming(0, { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN })
			);
			return;
		}
		if (chosen) {
			const t = { duration: LIFT.ms, easing: LIFT.ease, ...PLAY_AS_CHOSEN };
			y.set(withTiming(LIFT.by, t));
			scale.set(withTiming(LIFT.scale, t));
			opacity.set(
				withDelay(
					LIFT.fadeAt,
					withTiming(0, { duration: LIFT.fadeMs, ...PLAY_AS_CHOSEN })
				)
			);
			return;
		}
		const d = DROP.stagger * j;
		const by = Math.max(h.get(), VENT_H) * DROP.by;
		y.set(
			withDelay(
				d,
				withTiming(by, {
					duration: DROP.ms,
					easing: DROP.ease,
					...PLAY_AS_CHOSEN,
				})
			)
		);
		opacity.set(
			withDelay(d, withTiming(0, { duration: DROP.fadeMs, ...PLAY_AS_CHOSEN }))
		);
	}, [picked, chosen, j, reduced, y, opacity, scale, h]);

	const style = useAnimatedStyle(() => ({
		opacity: opacity.get(),
		transform: [{ translateY: y.get() }, { scale: scale.get() }],
	}));
	return (
		<Animated.View
			onLayout={(e: LayoutChangeEvent) => h.set(e.nativeEvent.layout.height)}
			pointerEvents={picked ? "none" : "auto"}
			style={[{ marginTop: j === 0 ? 0 : -OVERLAP }, style]}
		>
			{children}
		</Animated.View>
	);
}
