import { useEffect } from "react";
import { useLongPressGesture } from "react-native-gesture-handler";
import {
	type SharedValue,
	useAnimatedStyle,
	useDerivedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EASE, HOLD, TS } from "../session-look";
import type { Hold } from "./use-send";

/** The edge pill by hold: off, held .26, ready .36. */
const EDGE_AT = [0, HOLD.edge.held, HOLD.edge.ready] as const;

type Args = {
	hold: Hold;
	holdSv: SharedValue<number>;
	/** The card can be held (nothing answered yet). */
	holdable: boolean;
	reduced: boolean;
	/** ms since the send (< 0 before). */
	cs: SharedValue<number>;
	/** Where the buttons start, in the card: a press there isn't a hold. */
	rowTop: SharedValue<number>;
	onHold: (h: Hold) => void;
	onLeave: (how: "tap" | "hold") => void;
};

/**
 * Holding the card (paper-lantern-confirm's hold, on Gesture Handler 3's long
 * press): it lifts and warms from below, at 700 ms it's ready, and letting go
 * then sends it. Leaving the card or letting go earlier cools it back. While
 * the words leave, the floor light runs `litgo` on the send's clock.
 */
export function useCardHold(a: Args) {
	const { hold, holdSv, reduced, cs, rowTop, onHold, onLeave } = a;
	const lift = useSharedValue(0);
	const held = useSharedValue(0);
	const edge = useSharedValue(0);
	const ready = useSharedValue(0);

	useEffect(() => {
		lift.set(
			withTiming(hold && !reduced ? 1 : 0, {
				duration: HOLD.lift.ms,
				easing: EASE.lift,
				...PLAY_AS_CHOSEN,
			})
		);
		held.set(
			withTiming(hold ? 1 : 0, {
				duration: HOLD.light.ms,
				easing: EASE.lit,
				...PLAY_AS_CHOSEN,
			})
		);
		edge.set(
			withTiming(EDGE_AT[hold], {
				duration: HOLD.edge.ms,
				easing: EASE.easeOut,
				...PLAY_AS_CHOSEN,
			})
		);
		ready.set(
			withTiming(hold === 2 ? 1 : 0, {
				duration: HOLD.lift.ms,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [hold, reduced, lift, held, edge, ready]);

	const press = useLongPressGesture({
		enabled: a.holdable,
		maxDistance: 10_000,
		minDuration: HOLD.readyMs,
		onActivate: () => {
			if (holdSv.get() !== 1) {
				return;
			}
			holdSv.set(2);
			scheduleOnRN(onHold, 2);
		},
		onBegin: (e) => {
			if (e.y >= rowTop.get()) {
				return;
			}
			holdSv.set(1);
			scheduleOnRN(onHold, 1);
		},
		onFinalize: (e) => {
			const h = holdSv.get();
			holdSv.set(0);
			if (h === 2 && !e.canceled) {
				scheduleOnRN(onLeave, "hold");
			} else if (h > 0) {
				scheduleOnRN(onHold, 0);
			}
		},
		shouldCancelWhenOutside: true,
	});

	const card = useAnimatedStyle(() => ({
		transform: [
			{ translateY: HOLD.lift.y * lift.get() },
			{ scale: 1 + (HOLD.lift.scale - 1) * lift.get() },
		],
	}));
	const readyStyle = useAnimatedStyle(() => ({ opacity: ready.get() }));
	// `.lit` on while held; `litgo` while sending: .4 → 1 (22%) → .5 (60%) → 0 over 1.3 s.
	const floor = useDerivedValue(() => {
		const s = cs.get();
		if (s < 0 || reduced) {
			return held.get();
		}
		const u = s / TS.floor.ms;
		if (u >= 1) {
			return 0;
		}
		if (u < 0.22) {
			return 0.4 + 0.6 * EASE.css(u / 0.22);
		}
		if (u < 0.6) {
			return 1 - 0.5 * EASE.css((u - 0.22) / 0.38);
		}
		return 0.5 * (1 - EASE.css((u - 0.6) / 0.4));
	});

	return { card, edge, floor, press, readyStyle };
}
