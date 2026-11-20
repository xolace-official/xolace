import { useState } from "react";
import {
	Easing,
	type SharedValue,
	useAnimatedReaction,
	useDerivedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { WRITE_ON } from "@/components/shared/write-strips";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { WRITE_MAX } from "../arrival/arrival-end";
import { clamp01 } from "../arrival/arrival-time";
import { LAYOUT, MOTION } from "../peers-look";

const IN_VIEW = 40;
const NOT_YET = -1;
const OWN = -2;
const WRITTEN = -3;
const ROW_SHOWN = 0.5;
const DONE_TOP = LAYOUT.footer.bottom + LAYOUT.footer.height;

const rowAt = (lines: number, lastFrac: number) => {
	"worklet";
	return (
		WRITE_ON.lead +
		Math.max(0, lines - 1) * WRITE_ON.line +
		lastFrac * WRITE_ON.sweep +
		WRITE_ON.rowAfter
	);
};

type Args = {
	arrive: SharedValue<number>;
	arriveEnd: number;
	start: number;
	reduced: boolean;
	scrollY: SharedValue<number>;
	viewH: number;
	listTop: SharedValue<number>;
	y: SharedValue<number>;
};

export function useCardWrite({
	arrive,
	arriveEnd,
	start,
	reduced,
	scrollY,
	viewH,
	listTop,
	y,
}: Args) {
	const from = useSharedValue(reduced ? WRITTEN : NOT_YET);
	const own = useSharedValue(0);
	const lineCount = useSharedValue(0);
	const lastFrac = useSharedValue(1);
	const write = useDerivedValue(() => {
		const f = from.get();
		if (f === NOT_YET) {
			return -1;
		}
		if (f === WRITTEN) {
			return WRITE_MAX;
		}
		if (f === OWN) {
			return own.get();
		}
		return arrive.get() - f;
	});

	useAnimatedReaction(
		() => {
			if (from.get() !== NOT_YET || arrive.get() < start) {
				return 0;
			}
			const top = listTop.get() + y.get() + IN_VIEW;
			return top < scrollY.get() + viewH - DONE_TOP ? 2 : 1;
		},
		(v, was) => {
			if (v !== 2 || from.get() !== NOT_YET) {
				return;
			}
			const at = was === 1 ? arrive.get() : start;
			if (at + WRITE_MAX <= arriveEnd) {
				from.set(at);
				return;
			}
			from.set(OWN);
			own.set(0);
			own.set(
				withTiming(WRITE_MAX, {
					duration: WRITE_MAX,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	);

	const rowOpacity = useDerivedValue(() =>
		reduced
			? 1
			: clamp01(
					(write.get() - rowAt(Math.max(1, lineCount.get()), lastFrac.get())) /
						WRITE_ON.rowMs
				)
	);

	const [touchable, setTouchable] = useState(false);
	const landed = start + (reduced ? REDUCED_FADE_MS : MOTION.rise.ms);
	useAnimatedReaction(
		() => arrive.get() >= landed && rowOpacity.get() >= ROW_SHOWN,
		(on, was) => {
			if (on && !was) {
				scheduleOnRN(setTouchable, true);
			}
		}
	);
	return { lastFrac, lineCount, rowOpacity, touchable, write };
}
