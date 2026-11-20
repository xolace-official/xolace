import { usePanGesture } from "react-native-gesture-handler";
import {
	type SharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN, SETTLE } from "@/design/springs";
import { MOTION } from "../player-metrics";

const START_PT = 10;
const SIDEWAYS_PT = 20;
const OUT = { duration: 240, ...PLAY_AS_CHOSEN };
const BACK = { ...SETTLE, ...PLAY_AS_CHOSEN };

export function useSwipeClose({
	y,
	height,
	reduced,
	close,
}: {
	y: SharedValue<number>;
	height: number;
	reduced: boolean;
	close: () => void;
}) {
	return usePanGesture({
		activeOffsetY: START_PT,
		failOffsetX: [-SIDEWAYS_PT, SIDEWAYS_PT],
		onDeactivate: (e) => {
			const closing =
				e.translationY > MOTION.closeAt || e.velocityY > MOTION.closeFlick;
			if (reduced) {
				y.set(0);
				if (closing) {
					scheduleOnRN(close);
				}
			} else if (closing) {
				y.set(
					withTiming(height, OUT, (done) => {
						if (done) {
							scheduleOnRN(close);
						}
					})
				);
			} else {
				y.set(withSpring(0, BACK));
			}
		},
		onUpdate: (e) => {
			y.set(Math.max(0, e.translationY));
		},
	});
}
