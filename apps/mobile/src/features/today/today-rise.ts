import { EASING, type EaseProps } from "@/design/ease";
import { fadeUpProps } from "@/design/entering";
import { TIMING } from "./today-motion";

const RISE_DY = 14;

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

export function heldAtStart(enter: EaseProps, waiting: boolean): EaseProps {
	if (!(waiting && enter.initialAnimate)) {
		return enter;
	}
	return { ...enter, animate: enter.initialAnimate };
}
