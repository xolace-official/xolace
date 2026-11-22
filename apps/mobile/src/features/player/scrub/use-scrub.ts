import { usePanGesture } from "react-native-gesture-handler";
import { Presets } from "react-native-pulsar";
import {
	type SharedValue,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { tap } from "@/lib/haptics";
import { MOTION, OUT, WAVE } from "../player-metrics";
import { snapToBar, tickIndex } from "../player-model";
import type { Playhead } from "./use-playhead";

const GROW = { duration: MOTION.grow, easing: OUT, ...PLAY_AS_CHOSEN };
const selection = () => Presets.System.selection();

type Options = {
	head: Playhead;
	boxW: SharedValue<number>;
	duration: number;
	bars: number;
	reduced: boolean;
	onRelease: (seconds: number) => void;
	enabled?: boolean;
};

export function useScrub({
	head,
	boxW,
	duration,
	bars,
	reduced,
	onRelease,
	enabled = true,
}: Options) {
	const { scrubF, held, touch, grow, fingerX, progress } = head;
	const lastTick = useSharedValue(-1);
	const release = (seconds: number) => {
		tap();
		onRelease(seconds);
	};
	const follow = (x: number) => {
		"worklet";
		const w = boxW.get();
		const f = w > 0 ? Math.max(0, Math.min(1, x / w)) : 0;
		scrubF.set(f);
		fingerX.set(Math.max(0, Math.min(w, x)));
		return f;
	};
	return usePanGesture({
		enabled,
		minDistance: 0,
		onBegin: (e) => {
			const f = follow(e.x);
			held.set(1);
			touch.set(1);
			grow.set(reduced ? 1 : withTiming(1, GROW));
			lastTick.set(tickIndex(f, duration, WAVE.tickEvery));
		},
		onFinalize: () => {
			touch.set(0);
			grow.set(reduced ? 0 : withTiming(0, GROW));
			const to = snapToBar(scrubF.get(), bars);
			progress.set(to);
			if (bars > 0 && !reduced) {
				scrubF.set(
					withSpring(to, MOTION.snap, (done) => {
						if (done) {
							held.set(0);
						}
					})
				);
			} else {
				scrubF.set(to);
				held.set(0);
			}
			scheduleOnRN(release, to * duration);
		},
		onUpdate: (e) => {
			const tick = tickIndex(follow(e.x), duration, WAVE.tickEvery);
			if (tick !== lastTick.get()) {
				lastTick.set(tick);
				scheduleOnRN(selection);
			}
		},
	});
}
