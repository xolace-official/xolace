import { PLAY_AS_CHOSEN, PRESS } from "@/design/springs";

/** The block's `approach(power, 1, 8, dt)`: an exponential approach at 8 /s, as a timing curve. */
const POWER_RATE = 8;
const POWER_MS = 600;
const approach = (u: number) => {
	"worklet";
	const k = (POWER_RATE * POWER_MS) / 1000;
	return (1 - Math.exp(-k * u)) / (1 - Math.exp(-k));
};

/** The glow powering up and down with the take. */
export const POWER = {
	duration: POWER_MS,
	easing: approach,
	...PLAY_AS_CHOSEN,
} as const;
/** Board `.hmic`: the held mic scales on a .2 s ease (the Press curve). */
export const HELD = {
	duration: 200,
	easing: PRESS.easing,
	...PLAY_AS_CHOSEN,
} as const;
