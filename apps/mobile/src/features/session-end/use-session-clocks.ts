import {
	Easing,
	type SharedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { T1, T2, TS } from "./session-look";

export type Clock = "c1" | "c2" | "cs";
const END: Record<Clock, number> = { c1: T1.end, c2: T2.end, cs: TS.end };
const IDLE = -1;

export type SessionClocks = Record<Clock, SharedValue<number>> & {
	run: (which: Clock, from?: number) => void;
	stop: (which: Clock) => void;
};

export function useSessionClocks(): SessionClocks {
	const c1 = useSharedValue(IDLE);
	const c2 = useSharedValue(IDLE);
	const cs = useSharedValue(IDLE);
	const sv: Record<Clock, SharedValue<number>> = { c1, c2, cs };

	const run = (which: Clock, from = 0) => {
		const v = sv[which];
		const end = END[which];
		v.set(from);
		if (from < end) {
			v.set(
				withTiming(end, {
					duration: end - from,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	};
	const stop = (which: Clock) => sv[which].set(IDLE);

	return { c1, c2, cs, run, stop };
}
