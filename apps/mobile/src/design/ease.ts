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
 * react-native-ease, the app's way, and the only file that imports it
 * (`src/features/import-cycles.test.ts` checks). Ease runs an animation as a native Core
 * Animation / Animator animation instead of a Reanimated worklet, so a loop costs nothing per
 * frame. New Ease code is for loops (`ease-loops.ts`); enters, fades, presses and state changes
 * stay on Reanimated (`apps/mobile/AGENTS.md`, "Motion").
 *
 * Ease ignores Reduce Motion. Read `useEffectiveReducedMotion()` and pass it as `reduced`: a
 * reduced enter or state change becomes the 200 ms opacity fade with no transforms; a reduced
 * loop doesn't run and shows its resting value.
 *
 * Never put an animated property in `style` or `className` too (Ease strips it); put its
 * starting value in `initialAnimate`. Inline `style` beats `className`, as on a View.
 */
/** @public The view every Ease animation runs on; the redesign's pieces use it from F5. */
export { EaseView } from "react-native-ease/uniwind";

/** The easing curves as Ease tuples (the Reanimated `Easing.bezier` twins). */
export const EASING = {
	/** The boards' CSS ease-out (`EASE_OUT` in springs.ts). */
	easeOut: CURVE.easeOut,
	/** Easing.inOut(Easing.ease), fitted as a bezier. */
	inOutEase: [0.39, 0.06, 0.61, 0.94],
	/** Reanimated's `withTiming` default, Easing.inOut(Easing.quad). */
	inOutQuad: [0.455, 0.03, 0.515, 0.955],
	outQuad: [0.25, 0.46, 0.45, 0.94],
	/** Press feedback (`PRESS` in springs.ts). */
	press: CURVE.press,
	/** Easing.inOut(Easing.sin): the breath and the drift loops. */
	sineInOut: [0.37, 0, 0.63, 1],
} as const satisfies Record<string, CubicBezier>;

/**
 * The named springs as Ease configs. SETTLE and GLIDE are Reanimated duration springs
 * ({ dampingRatio, duration }); these are the stiffness and damping Reanimated 4.7's own solver
 * picks for them, so the curves match within 0.04% of the travel.
 */
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
/** Badges and streak days: an under-damped pop, ζ .5. */
export const POP: SpringTransition = {
	damping: 15.5,
	mass: 1,
	stiffness: 240,
	type: "spring",
};

/** The reduced crossfade: 200 ms on `withTiming`'s default curve. */
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

/** springs.ts `spring()` on Ease: a named spring, or the 200 ms fade when reduced. */
export function springTransition(
	name: SpringName,
	reduced: boolean
): Transition {
	return reduced ? REDUCED : SPRINGS[name];
}

/** springs.ts `press()` on Ease: 150 ms on the press curve. */
export const PRESS_TIMING: TimingTransition = {
	duration: 150,
	easing: EASING.press,
	type: "timing",
};

/** A fade on out-quad (Reanimated's Easing.out(Easing.quad)). */
export function fadeTiming(duration = REDUCED_FADE_MS): TimingTransition {
	return { duration, easing: EASING.outQuad, type: "timing" };
}

/** What the helpers return: spread onto an EaseView. */
export type EaseProps = {
	initialAnimate?: AnimateProps;
	animate: AnimateProps;
	transition: Transition;
};

/** `t` after `delay` ms; no `delay` key at all when it is 0, and none on a `none`. */
export function delayed<T extends SingleTransition>(t: T, delay: number): T {
	return t.type === "none" || delay === 0 ? t : { ...t, delay };
}

/** The reduced enter: a 200 ms opacity fade, no transforms, no delay. */
export const FADE_IN: EaseProps = {
	animate: { opacity: 1 },
	initialAnimate: { opacity: 0 },
	transition: REDUCED,
};

/**
 * An enter: opacity on a timing curve and the transforms on their own transition, both after
 * `delay`. `fadeUpProps` in entering.ts is built on it.
 */
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

/**
 * A state change (a fade, a slide, a colour on a toggle) on an element already on Ease. Pass
 * its normal transition; reduced, opacity takes the 200 ms fade and the rest applies at once.
 */
export function stateTransition(
	reduced: boolean,
	transition: Transition
): Transition {
	return reduced ? { default: NONE, opacity: REDUCED } : transition;
}
