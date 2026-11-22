import { Gesture } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { VentPhase } from "@/features/vent/vent-data";

const PINCH_SCALE = 1.15;
const FLICK_SPEED = 400;
const FLICK_DIST = 40;
const PAN_START = 12;

export function useVentGestures(
	phase: VentPhase,
	onBurst: () => void,
	onFlick: (x: number, y: number) => void
) {
	const fired = useSharedValue(0);
	const pinch = Gesture.Pinch()
		.enabled(phase === "burn")
		.onBegin(() => {
			fired.set(0);
		})
		.onUpdate((e) => {
			if (e.scale > PINCH_SCALE && fired.get() === 0) {
				fired.set(1);
				scheduleOnRN(onBurst);
			}
		});
	const flick = Gesture.Pan()
		.enabled(phase === "rec")
		.minDistance(PAN_START)
		.onEnd((e) => {
			if (e.translationY > -FLICK_DIST || e.velocityY > -FLICK_SPEED) {
				return;
			}
			const len = Math.hypot(e.translationX, e.translationY);
			scheduleOnRN(onFlick, e.translationX / len, e.translationY / len);
		});
	return Gesture.Simultaneous(pinch, flick);
}
