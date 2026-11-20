import { useEffect, useRef, useState } from "react";
import {
	type FrameCallback,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const QUALITY = {
	allowed: 6,
	frame: 24,
	settle: 6,
	settledUnder: 34,
	window: 2000,
} as const;

export function useQualityGate(run: boolean): boolean {
	const [low, setLow] = useState(false);
	const smooth = useSharedValue(0);
	const startedAt = useSharedValue(-1);
	const slow = useSharedValue(0);
	const done = useSharedValue(false);
	const gateRef = useRef<FrameCallback | null>(null);
	const stop = () => gateRef.current?.setActive(false);

	const gate = useFrameCallback((frame) => {
		if (done.get()) {
			return;
		}
		const dt = frame.timeSincePreviousFrame ?? 0;
		if (smooth.get() < QUALITY.settle) {
			smooth.set(dt < QUALITY.settledUnder ? smooth.get() + 1 : 0);
			return;
		}
		if (startedAt.get() < 0) {
			startedAt.set(frame.timestamp);
			return;
		}
		if (frame.timestamp - startedAt.get() <= QUALITY.window) {
			if (dt > QUALITY.frame) {
				slow.set(slow.get() + 1);
			}
			return;
		}
		done.set(true);
		if (slow.get() > QUALITY.allowed) {
			scheduleOnRN(setLow, true);
		}
		scheduleOnRN(stop);
	}, false);

	useEffect(() => {
		gateRef.current = gate;
		if (!run) {
			return;
		}
		gate.setActive(true);
		return () => gate.setActive(false);
	}, [gate, run]);

	return low;
}
