import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import {
	type SharedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { useAppActive } from "@/components/shared/use-app-active";

const MAX_STEP_MS = 50;
const DEFAULT_FRAME_MS = 16;
const STEP_SLACK = 0.9;

export function useLive(reduced: boolean): boolean {
	const focused = useIsFocused();
	const active = useAppActive();
	return focused && active && !reduced;
}

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
