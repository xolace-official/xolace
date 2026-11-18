import { EASING, type EaseProps } from "@/design/ease";
import { fadeUpProps } from "@/design/entering";
import { TIMING } from "./today-motion";

const RISE_DY = 14;

/**
 * First open of the day: a module rises 14 pt and fades in over 0.62 s in its slot (120,
 * 200, 280 ms), on the ease-out curve, not a spring. Spread onto the module's EaseView.
 * Undefined when it isn't the first open, so the module mounts in place.
 */
export function todayRiseProps(
	slot: number,
	intro: boolean,
	reduced: boolean
): EaseProps | undefined {
	if (!intro) {
		return;
	}
	return fadeUpProps(
		TIMING.riseSlots[slot] ?? 0,
		TIMING.rise,
		RISE_DY,
		reduced,
		EASING.easeOut
	);
}
