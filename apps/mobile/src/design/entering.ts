import {
	FadeIn,
	ReduceMotion,
	withDelay,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import {
	type CubicBezier,
	EASING,
	type EaseProps,
	enter,
	FADE_IN,
} from "./ease";
import { EASE_OUT, PLAY_AS_CHOSEN, REDUCED_FADE_MS, SETTLE } from "./springs";

/**
 * The boards' enters. Reduced, each is the 200 ms fade.
 *
 * - `riseIn`, `fadeUp`: Reanimated `entering` animations, for `<Animated.View entering={…}>`.
 * - `fadeUpProps`: the same fadeUp as EaseView props, for the elements already on Ease.
 */

/** The reduced enter. Like every enter here it plays as chosen (`PLAY_AS_CHOSEN` in
 * springs.ts), so Reanimated's own reduce-motion mode doesn't skip it. */
const reducedEnter = () =>
	FadeIn.duration(REDUCED_FADE_MS).reduceMotion(ReduceMotion.Never);

/** `animation` after `delay` ms, played as chosen. */
function after(delay: number, animation: number): number {
	"worklet";
	return withDelay(delay, animation, ReduceMotion.Never);
}

/** Rise: fade up from `dy` on the Settle spring, after `delay` ms. */
export function riseIn(delay: number, reduced: boolean, dy = 14) {
	if (reduced) {
		return reducedEnter();
	}
	return () => {
		"worklet";
		return {
			animations: {
				opacity: after(
					delay,
					withTiming(1, { duration: 360, easing: EASE_OUT, ...PLAY_AS_CHOSEN })
				),
				transform: [
					{
						translateY: after(
							delay,
							withSpring(0, { ...SETTLE, ...PLAY_AS_CHOSEN })
						),
					},
				],
			},
			initialValues: { opacity: 0, transform: [{ translateY: dy }] },
		};
	};
}

/** The boards' CSS `fadeUp`: opacity 0 → 1 rising `dy` over `ms`, on an ease (no spring). */
export function fadeUp(
	delay: number,
	ms: number,
	dy: number,
	reduced: boolean,
	easing = EASE_OUT
) {
	if (reduced) {
		return reducedEnter();
	}
	return () => {
		"worklet";
		return {
			animations: {
				opacity: after(
					delay,
					withTiming(1, { duration: ms, easing, ...PLAY_AS_CHOSEN })
				),
				transform: [
					{
						translateY: after(
							delay,
							withTiming(0, { duration: ms, easing, ...PLAY_AS_CHOSEN })
						),
					},
				],
			},
			initialValues: { opacity: 0, transform: [{ translateY: dy }] },
		};
	};
}

/**
 * `fadeUp` on Ease: `dy` → 0 over `ms`, no spring. `easing` is a tuple: the twin of the
 * `Easing.bezier` the Reanimated call used.
 */
export function fadeUpProps(
	delay: number,
	ms: number,
	dy: number,
	reduced: boolean,
	easing: CubicBezier = EASING.easeOut
): EaseProps {
	if (reduced) {
		return FADE_IN;
	}
	const timing = { duration: ms, easing, type: "timing" } as const;
	return enter(
		{ opacity: 0, translateY: dy },
		{ opacity: 1, translateY: 0 },
		timing,
		timing,
		delay
	);
}
