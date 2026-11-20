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
	POP,
} from "./ease";
import { EASE_OUT, PLAY_AS_CHOSEN, REDUCED_FADE_MS, SETTLE } from "./springs";

const reducedEnter = () =>
	FadeIn.duration(REDUCED_FADE_MS).reduceMotion(ReduceMotion.Never);

function after(delay: number, animation: number): number {
	"worklet";
	return withDelay(delay, animation, ReduceMotion.Never);
}

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

export function popProps(
	delay: number,
	reduced: boolean,
	from = 0.4
): EaseProps {
	if (reduced) {
		return FADE_IN;
	}
	return enter(
		{ opacity: 0, scale: from },
		{ opacity: 1, scale: 1 },
		{ duration: 180, easing: EASING.inOutQuad, type: "timing" },
		POP,
		delay
	);
}
