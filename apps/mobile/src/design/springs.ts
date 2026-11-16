import {
	Easing,
	ReduceMotion,
	type WithSpringConfig,
	type WithTimingConfig,
	withSpring,
	withTiming,
} from "react-native-reanimated";

/**
 * The redesign's motion vocabulary on Reanimated: the named springs, the press, the breath.
 * Their react-native-ease twins are in `ease.ts`. With reduced motion every move becomes the
 * 200 ms crossfade (`REDUCED_FADE_MS`); read it with `useEffectiveReducedMotion()` and pass it in.
 */

type Curve = [x1: number, y1: number, x2: number, y2: number];

/** The curves as cubic-bezier tuples, the one place their numbers live. Reanimated builds its
 * easings from these; Ease takes them as they are (`EASING` in `ease.ts`). */
export const CURVE: Record<"press" | "easeOut", Curve> = {
	easeOut: [0.2, 0.8, 0.2, 1],
	press: [0.23, 1, 0.32, 1],
};

export const PRESS = {
	cardScale: 0.98,
	duration: 150,
	easing: Easing.bezier(...CURVE.press),
	scale: 0.96,
} as const;

/** SETTLE and GLIDE are duration springs; `ease.ts` holds their solved stiffness and damping. */
export const SETTLE: WithSpringConfig = { dampingRatio: 0.82, duration: 340 };
export const GLIDE: WithSpringConfig = { dampingRatio: 1, duration: 420 };
export const BLOOM: WithSpringConfig = { damping: 11, mass: 1, stiffness: 160 };
/** Badges and streak days: an under-damped pop, ζ .5. */
export const POP: WithSpringConfig = { damping: 15.5, mass: 1, stiffness: 240 };

/** The breath every idle loop shares. Night slows every loop by `NIGHT_SLOWDOWN`. */
export const BREATH = {
	/** One full cycle by day, and at night (`useBreathPeriod`). */
	dayMs: 4800,
	nightMs: 6700,
	/** How far it lifts, in pt, and how much it grows. */
	rise: 3,
	scale: 1.02,
} as const;

export const NIGHT_SLOWDOWN = 1.4;
export const REDUCED_FADE_MS = 200;

/**
 * Every helper here already knows whether motion is reduced (`reduced`, from
 * `useEffectiveReducedMotion()`), so each animation it starts plays as chosen. Reanimated's own
 * "System" mode would decide again: `ReducedMotionConfig` (only in the protected layout) skips
 * animations when motion is reduced, and elsewhere the OS setting alone does, so a user who set
 * "full" would still get snaps. Spread this into every config.
 */
export const PLAY_AS_CHOSEN = { reduceMotion: ReduceMotion.Never } as const;

const PRESS_TIMING: WithTimingConfig = {
	duration: PRESS.duration,
	easing: PRESS.easing,
	...PLAY_AS_CHOSEN,
};

/** The reduced crossfade: 200 ms on `withTiming`'s default curve. */
const REDUCED: WithTimingConfig = {
	duration: REDUCED_FADE_MS,
	...PLAY_AS_CHOSEN,
};

export type SpringName = "settle" | "glide" | "bloom" | "pop";
const SPRINGS: Record<SpringName, WithSpringConfig> = {
	bloom: { ...BLOOM, ...PLAY_AS_CHOSEN },
	glide: { ...GLIDE, ...PLAY_AS_CHOSEN },
	pop: { ...POP, ...PLAY_AS_CHOSEN },
	settle: { ...SETTLE, ...PLAY_AS_CHOSEN },
};

/** Animate with a named spring, or the 200 ms fade when motion is reduced. */
export function spring(name: SpringName, to: number, reduced: boolean) {
	"worklet";
	return reduced ? withTiming(to, REDUCED) : withSpring(to, SPRINGS[name]);
}

/**
 * The press: 150 ms on the press curve. Reduced, the value is applied at once (no transform
 * animates), as the prototype's PressScale and hero hold already skipped the press when reduced.
 */
export function press(to: number, reduced: boolean) {
	"worklet";
	return reduced ? to : withTiming(to, PRESS_TIMING);
}

/** The boards' ease-out (`riseIn`, `fadeUp`). */
export const EASE_OUT = Easing.bezier(...CURVE.easeOut);
