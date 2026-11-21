import { PLAY_AS_CHOSEN, PRESS } from "@/design/springs";

const POWER_RATE = 8;
const POWER_MS = 600;
const approach = (u: number) => {
	"worklet";
	const k = (POWER_RATE * POWER_MS) / 1000;
	return (1 - Math.exp(-k * u)) / (1 - Math.exp(-k));
};

export const POWER = {
	duration: POWER_MS,
	easing: approach,
	...PLAY_AS_CHOSEN,
} as const;
export const HELD = {
	duration: 200,
	easing: PRESS.easing,
	...PLAY_AS_CHOSEN,
} as const;
