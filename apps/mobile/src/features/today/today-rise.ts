import { EASING, type EaseProps } from "@/design/ease";
import { fadeUpProps } from "@/design/entering";
import { TIMING } from "./today-motion";

const RISE_DY = 14;

/**
 * First open of the day: a module rises 14 pt and fades in over 0.62 s in its slot (120,
 * 200, 280 ms), on the ease-out curve, not a spring. Spread onto the module's EaseView.
 * Undefined when it isn't the first open, so the module mounts in place. While `waiting`
 * (the launch cover is still up) it holds at the start.
 */
export function todayRiseProps(
	slot: number,
	intro: boolean,
	reduced: boolean,
	waiting: boolean
): EaseProps | undefined {
	if (!intro) {
		return;
	}
	return heldAtStart(
		fadeUpProps(
			TIMING.riseSlots[slot] ?? 0,
			TIMING.rise,
			RISE_DY,
			reduced,
			EASING.easeOut
		),
		waiting
	);
}

/**
 * An Ease enter that waits (`TodayFrameValue.waiting`): it sits at its start until `waiting`
 * clears, then plays to its end with its own transition and delay.
 */
export function heldAtStart(enter: EaseProps, waiting: boolean): EaseProps {
	if (!(waiting && enter.initialAnimate)) {
		return enter;
	}
	return { ...enter, animate: enter.initialAnimate };
}
