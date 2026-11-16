import { useSessionMode } from "@/context/session-mode-context";
import { BREATH, NIGHT_SLOWDOWN } from "./springs";

/**
 * Loop timing for the hour. Night (the night theme, `useSessionMode().isNight`) slows every
 * loop. Reduced motion is not here: read `useEffectiveReducedMotion()`
 * (`src/lib/motion/use-effective-reduced-motion.ts`), the one resolver of the in-app
 * preference and the OS setting.
 */

/** The factor to stretch a loop's period by: 1 by day, `NIGHT_SLOWDOWN` at night. */
export const loopScale = (isNight: boolean): number =>
	isNight ? NIGHT_SLOWDOWN : 1;

/** One full breath in ms, slower at night. */
export const breathPeriod = (isNight: boolean): number =>
	isNight ? BREATH.nightMs : BREATH.dayMs;

/** @public For the redesign's looping pieces (Aura, Flux), ported in F5. */
export function useLoopScale(): number {
	return loopScale(useSessionMode().isNight);
}

/** @public For the redesign's breathing pieces (Flux, the launch cover, peers' face). */
export function useBreathPeriod(): number {
	return breathPeriod(useSessionMode().isNight);
}
