import { useEffect } from "react";
import {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	type WithTimingConfig,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { clamp01 } from "../arrival/arrival-time";
import { EASE } from "../peers-ease";
import { CARD_LIGHT, LAYOUT, MOTION } from "../peers-look";

/** believe-card-carousel's closed-form rise: from 1 to 0, about 2% past. */
function spring(ms: number): number {
	"worklet";
	const s = ms / 1000;
	if (s <= 0) {
		return 1;
	}
	const { omega, zeta } = MOTION.rise;
	const wd = omega * Math.sqrt(1 - zeta * zeta);
	return (
		Math.exp(-zeta * omega * s) *
		(Math.cos(wd * s) + ((zeta * omega) / wd) * Math.sin(wd * s))
	);
}

const timed = (
	duration: number,
	easing?: WithTimingConfig["easing"]
): WithTimingConfig => ({
	duration,
	// An `easing: undefined` would replace the default curve with nothing.
	...(easing ? { easing } : {}),
	...PLAY_AS_CHOSEN,
});

type Args = {
	arrive: SharedValue<number>;
	/** When this card starts rising (arrival ms). */
	start: number;
	on: boolean;
	gone: boolean;
	reduced: boolean;
	/** The card's height before it folds. */
	h: SharedValue<number>;
};

/**
 * A card's own motion: the rise on its turn (28 pt on believe-card-carousel's
 * spring, opaque by 40% of .62 s), the light on (.45 s) and off (.7 s), and the
 * fold when it's reported or hidden (height → 0 over .42 s on the sheet curve,
 * opacity .25 s). Reduce Motion: 200 ms fades, no rise.
 */
export function useCardMotion({ arrive, start, on, gone, reduced, h }: Args) {
	const leave = useSharedValue(gone ? 1 : 0);
	const fade = useSharedValue(gone ? 1 : 0);
	const lit = useSharedValue(on ? 1 : 0);
	const edgeOn = useSharedValue(on ? 1 : 0);

	useEffect(() => {
		const L = CARD_LIGHT;
		const to = on ? 1 : 0;
		const inner = on ? L.inner.onMs : L.inner.offMs;
		const outer = on ? L.edge.onMs : L.edge.offMs;
		lit.set(withTiming(to, timed(reduced ? REDUCED_FADE_MS : inner, EASE.lit)));
		edgeOn.set(
			withTiming(to, timed(reduced ? REDUCED_FADE_MS : outer, EASE.easeOut))
		);
	}, [on, reduced, lit, edgeOn]);
	useEffect(() => {
		if (!gone) {
			return;
		}
		leave.set(
			withTiming(
				1,
				timed(reduced ? REDUCED_FADE_MS : MOTION.leaveMs, EASE.leave)
			)
		);
		fade.set(
			withTiming(1, timed(reduced ? REDUCED_FADE_MS : MOTION.leaveFadeMs))
		);
	}, [gone, reduced, leave, fade]);

	const wrap = useAnimatedStyle(() => {
		const e = arrive.get() - start;
		const shown = reduced
			? clamp01(e / REDUCED_FADE_MS)
			: Math.min(
					1,
					EASE.rise(clamp01(e / (MOTION.rise.ms * MOTION.rise.opaqueAt)))
				);
		const k = leave.get();
		let rise = 0;
		if (!reduced) {
			rise = e <= 0 ? MOTION.rise.from : MOTION.rise.from * spring(e);
		}
		return {
			marginBottom: LAYOUT.cards.gap * (1 - k),
			opacity: (e <= 0 ? 0 : shown) * (1 - fade.get()),
			transform: [{ translateY: rise }],
			...(k > 0 ? { height: h.get() * (1 - k), overflow: "hidden" } : {}),
		};
	});
	return { edgeOn, leave, lit, wrap };
}
