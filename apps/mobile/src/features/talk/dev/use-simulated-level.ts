import { useEffect } from "react";
import {
	useFrameCallback,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";

const MS_PER_S = 1000;
const REST_MS = 260;
const AMBIENT = { base: 0.12, swing: 0.08 } as const;
const VOICE = { base: 0.5, swing: 0.4 } as const;
const REST = { duration: REST_MS, ...PLAY_AS_CHOSEN };

export function useSimulatedLevel(listening: boolean, speaking: boolean) {
	const level = useSharedValue(0);
	const loud = useSharedValue(0);

	const frame = useFrameCallback((info) => {
		const s = info.timestamp / MS_PER_S;
		const noise =
			(Math.sin(s * 7.3) +
				Math.sin(s * 11.9 + 1.3) * 0.6 +
				Math.sin(s * 3.1 + 2.1) * 0.8) /
			2.4;
		const k = loud.get();
		const base = AMBIENT.base + (VOICE.base - AMBIENT.base) * k;
		const swing = AMBIENT.swing + (VOICE.swing - AMBIENT.swing) * k;
		level.set(Math.min(1, Math.max(0, base + swing * noise)));
	}, false);

	const { setActive } = frame;
	useEffect(() => {
		setActive(listening);
		if (!listening) {
			level.set(withTiming(0, REST));
		}
		return () => setActive(false);
	}, [listening, setActive, level]);

	useEffect(() => {
		loud.set(withTiming(speaking ? 1 : 0, REST));
	}, [speaking, loud]);

	return level;
}
