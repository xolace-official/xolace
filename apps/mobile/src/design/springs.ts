import {
	Easing,
	ReduceMotion,
	type WithSpringConfig,
	type WithTimingConfig,
	withSpring,
	withTiming,
} from "react-native-reanimated";

type Curve = [x1: number, y1: number, x2: number, y2: number];

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

export const SETTLE: WithSpringConfig = { dampingRatio: 0.82, duration: 340 };
export const GLIDE: WithSpringConfig = { dampingRatio: 1, duration: 420 };
export const BLOOM: WithSpringConfig = { damping: 11, mass: 1, stiffness: 160 };
export const POP: WithSpringConfig = { damping: 15.5, mass: 1, stiffness: 240 };

export const BREATH = {
	dayMs: 4800,
	nightMs: 6700,
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

export function spring(name: SpringName, to: number, reduced: boolean) {
	"worklet";
	return reduced ? withTiming(to, REDUCED) : withSpring(to, SPRINGS[name]);
}

export function press(to: number, reduced: boolean) {
	"worklet";
	return reduced ? to : withTiming(to, PRESS_TIMING);
}

export const EASE_OUT = Easing.bezier(...CURVE.easeOut);
