import { useSessionMode } from "@/context/session-mode-context";
import { BREATH, NIGHT_SLOWDOWN } from "./springs";

export const loopScale = (isNight: boolean): number =>
	isNight ? NIGHT_SLOWDOWN : 1;

export const breathPeriod = (isNight: boolean): number =>
	isNight ? BREATH.nightMs : BREATH.dayMs;

export function useLoopScale(): number {
	return loopScale(useSessionMode().isNight);
}

export function useBreathPeriod(): number {
	return breathPeriod(useSessionMode().isNight);
}
