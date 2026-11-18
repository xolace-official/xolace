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
/** Not started. */
const IDLE = -1;

export type SessionClocks = Record<Clock, SharedValue<number>> & {
	/** Starts a clock at `from` ms and runs it to its end in real time. */
	run: (which: Clock, from?: number) => void;
	stop: (which: Clock) => void;
};

/**
 * The screen's three clocks, in board ms, each one linear value on the UI
 * thread: `c1` moment 1, `c2` moment 2, `cs` the send. Every piece of motion is
 * a pure function of one of them (`timeline.ts`), so they stay in step to the
 * frame and nothing runs once they stop. They play as chosen: Reduce Motion is
 * already in each piece's function, so Reanimated mustn't snap the clock too.
 */
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
