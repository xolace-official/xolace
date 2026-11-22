import { useEffect } from "react";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const MAX_STEP_MS = 50;
const FRAME_MS = 16;
const MS_PER_S = 1000;

export function useMirrorClock(
	landN: number,
	cap: number,
	running: boolean,
	reduced: boolean
) {
	const e = useSharedValue(reduced ? cap : 0);
	const done = useSharedValue(reduced);
	const stop = () => frame.setActive(false);
	const frame = useFrameCallback((f) => {
		if (done.get()) {
			return;
		}
		const dt =
			Math.min(f.timeSincePreviousFrame ?? FRAME_MS, MAX_STEP_MS) / MS_PER_S;
		const next = e.get() + dt;
		if (next >= cap) {
			e.set(cap);
			done.set(true);
			scheduleOnRN(stop);
			return;
		}
		e.set(next);
	}, false);
	const { setActive } = frame;

	useEffect(() => {
		e.set(reduced ? cap : 0);
		done.set(reduced);
	}, [landN, cap, reduced, e, done]);

	useEffect(() => {
		setActive(running && !reduced);
		return () => setActive(false);
	}, [landN, running, reduced, setActive]);

	return e;
}
