import type {
	AnimateProps,
	CubicBezier,
	NoneTransition,
	SingleTransition,
	SpringTransition,
	TimingTransition,
	Transition,
} from "react-native-ease";
import { CURVE, REDUCED_FADE_MS, type SpringName } from "./springs";

export type {
	AnimateProps,
	CubicBezier,
	TimingTransition,
	Transition,
} from "react-native-ease";
/**
 * Ease ignores Reduce Motion. Read `useEffectiveReducedMotion()` and pass it as `reduced`: a
 * reduced enter or state change becomes the 200 ms opacity fade with no transforms; a reduced
 * loop doesn't run and shows its resting value.
 *
 * Never put an animated property in `style` or `className` too (Ease strips it); put its
 * starting value in `initialAnimate`. Inline `style` beats `className`, as on a View.
 */
export { EaseView } from "react-native-ease/uniwind";

export const EASING = {
	easeOut: CURVE.easeOut,
	inOutEase: [0.39, 0.06, 0.61, 0.94],
	inOutQuad: [0.455, 0.03, 0.515, 0.955],
	outQuad: [0.25, 0.46, 0.45, 0.94],
	press: CURVE.press,
	sineInOut: [0.37, 0, 0.63, 1],
} as const satisfies Record<string, CubicBezier>;

export const SETTLE: SpringTransition = {
	damping: 48.2,
	mass: 1,
	stiffness: 862.1,
	type: "spring",
};
export const GLIDE: SpringTransition = {
	damping: 39.3,
	mass: 1,
	stiffness: 385.4,
	type: "spring",
};
const BLOOM: SpringTransition = {
	damping: 11,
	mass: 1,
	stiffness: 160,
	type: "spring",
};
export const POP: SpringTransition = {
	damping: 15.5,
	mass: 1,
	stiffness: 240,
	type: "spring",
};

export const REDUCED: TimingTransition = {
	duration: REDUCED_FADE_MS,
	easing: EASING.inOutQuad,
	type: "timing",
};
export const NONE: NoneTransition = { type: "none" };

const SPRINGS: Record<SpringName, SpringTransition> = {
	bloom: BLOOM,
	glide: GLIDE,
	pop: POP,
	settle: SETTLE,
};

export function springTransition(
	name: SpringName,
	reduced: boolean
): Transition {
	return reduced ? REDUCED : SPRINGS[name];
}

export const PRESS_TIMING: TimingTransition = {
	duration: 150,
	easing: EASING.press,
	type: "timing",
};

export function fadeTiming(duration = REDUCED_FADE_MS): TimingTransition {
	return { duration, easing: EASING.outQuad, type: "timing" };
}

export type EaseProps = {
	initialAnimate?: AnimateProps;
	animate: AnimateProps;
	transition: Transition;
};

export function delayed<T extends SingleTransition>(t: T, delay: number): T {
	return t.type === "none" || delay === 0 ? t : { ...t, delay };
}

export const FADE_IN: EaseProps = {
	animate: { opacity: 1 },
	initialAnimate: { opacity: 0 },
	transition: REDUCED,
};

export function enter(
	from: AnimateProps,
	to: AnimateProps,
	opacity: TimingTransition,
	transform: SingleTransition,
	delay: number
): EaseProps {
	return {
		animate: to,
		initialAnimate: from,
		transition: {
			opacity: delayed(opacity, delay),
			transform: delayed(transform, delay),
		},
	};
}

export function stateTransition(
	reduced: boolean,
	transition: Transition
): Transition {
	return reduced ? { default: NONE, opacity: REDUCED } : transition;
}
