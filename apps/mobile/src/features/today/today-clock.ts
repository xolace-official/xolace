import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import {
	type SharedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { useAppActive } from "@/components/shared/use-app-active";

/** Frames longer than this (a hitch, a resume) advance the clock by this much only. */
const MAX_STEP_MS = 50;
const DEFAULT_FRAME_MS = 16;
/** A little under one step, so a 60 Hz display lands every 2nd frame for 30 fps. */
const STEP_SLACK = 0.9;

/**
 * Whether Today's loops may run at all: the tab is in front, the app is in the
 * foreground and Reduce Motion is off. Every clock on Today starts from this.
 */
export function useLive(reduced: boolean): boolean {
	const focused = useIsFocused();
	const active = useAppActive();
	return focused && active && !reduced;
}

/**
 * A seconds clock on the UI thread. It runs only while `running` (set from JS,
 * so a stopped clock costs nothing) and, if given, while `onScreen` is true
 * (read per frame, so scrolling a module away pauses it without a render).
 *
 * `fps` (opt-in) caps how often the clock is written: below the display rate it
 * holds the elapsed time and writes it in one step, so everything that reads the
 * clock (mappers, Skia redraws) runs at that rate. Speeds don't change, only how
 * often a frame is drawn. For slow motion that doesn't need every frame.
 */
export function useClock(
	running: boolean,
	onScreen?: SharedValue<boolean>,
	fps?: number
): SharedValue<number> {
	const time = useSharedValue(0);
	const pending = useSharedValue(0);
	const stepS = fps ? 1 / fps : 0;
	const callback = useFrameCallback((frame) => {
		if (onScreen && !onScreen.get()) {
			return;
		}
		const dt =
			Math.min(frame.timeSincePreviousFrame ?? DEFAULT_FRAME_MS, MAX_STEP_MS) /
			1000;
		if (stepS === 0) {
			time.set(time.get() + dt);
			return;
		}
		const held = pending.get() + dt;
		if (held < stepS * STEP_SLACK) {
			pending.set(held);
			return;
		}
		pending.set(0);
		time.set(time.get() + held);
	}, false);
	useEffect(() => {
		callback.setActive(running);
		return () => callback.setActive(false);
	}, [callback, running]);
	return time;
}
