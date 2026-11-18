import { useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import {
	Easing,
	useAnimatedReaction,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { press } from "@/design/springs";
import { playSessionComplete } from "@/lib/haptics";
import { EASE_CSS, EASE_CSS_OUT, EASE_DRAIN } from "../today-motion";
import { DOORS, doorsLandMs, HERO } from "./hero-model";

const tick = () => Presets.System.selection();

/**
 * Hold the card (habit-bubble-cluster's charge): the rim fills linearly over
 * 620 ms with selection ticks at ⅓ and ⅔; let go early and it drains in
 * 320 ms; at 620 ms the doors open and land on a Bloom. Not `holdable` (a mirror
 * waiting or ready), a press only dips the card: the doors are for starting something new.
 */
export function useHold(reduced: boolean, holdable: boolean) {
	const [chosen, setChosen] = useState(false);
	const rim = useSharedValue(0);
	const rimOpacity = useSharedValue(1);
	const scale = useSharedValue(1);
	const body = useSharedValue(1);
	const holding = useSharedValue(false);
	const swept = useRef(false);

	// A tick each time the charge crosses a third, only while a finger is down.
	useAnimatedReaction(
		() => {
			if (!holding.get()) {
				return 0;
			}
			const r = rim.get();
			return r >= HERO.ticks[1] ? 2 : r >= HERO.ticks[0] ? 1 : 0;
		},
		(now, before) => {
			if (before !== null && now > before) {
				scheduleOnRN(tick);
			}
		}
	);

	const pressIn = () => {
		if (chosen) {
			return;
		}
		swept.current = false;
		scale.set(press(HERO.holdScale, reduced));
		if (!holdable) {
			return;
		}
		holding.set(true);
		rim.set(withTiming(1, { duration: HERO.holdMs, easing: Easing.linear }));
	};

	const pressOut = () => {
		holding.set(false);
		scale.set(press(1, reduced));
		if (!(chosen || swept.current)) {
			rim.set(withTiming(0, { duration: HERO.drainMs, easing: EASE_DRAIN }));
		}
	};

	// A tap opens Reflect: the rim runs the rest of its lap quickly and stays lit until Reflect
	// covers the card (`release`), then fades under the zoom. Before, a tap's rim kept filling for
	// as long as Reflect took to mount (the drain waits on the JS thread), so how far it got
	// depended on the device and the stage. pressOut can land after onPress (the press's minimum
	// duration), so it leaves a sweep alone.
	const sweep = () => {
		holding.set(false);
		if (reduced) {
			return;
		}
		swept.current = true;
		rim.set(
			withTiming(1, {
				duration: HERO.tapSweepMs * (1 - rim.get()),
				easing: EASE_CSS_OUT,
			})
		);
	};

	/** Today lost focus as Reflect mounted, just before the zoom: a tap's lit rim fades under it. */
	const release = () => {
		if (!swept.current) {
			return;
		}
		rimOpacity.set(
			withDelay(
				HERO.releaseDelayMs,
				withTiming(0, { duration: HERO.drainMs, easing: EASE_DRAIN })
			)
		);
	};

	/** Back on Today: the rim is drawn back while it's out of sight (opacity 0), then shown again. */
	const rest = () => {
		if (!swept.current) {
			return;
		}
		swept.current = false;
		rim.set(0);
		rimOpacity.set(1);
	};

	const choose = () => {
		if (!holdable) {
			return;
		}
		holding.set(false);
		setChosen(true);
		rim.set(1);
		rimOpacity.set(
			withTiming(HERO.chosenRim, { duration: HERO.rimFadeMs, easing: EASE_CSS })
		);
		body.set(withTiming(0, { duration: HERO.bodyOutMs, easing: EASE_CSS }));
		// The doors land: the last tile finishes its burst.
		setTimeout(playSessionComplete, reduced ? 0 : doorsLandMs(DOORS.length));
	};

	const unchoose = () => {
		setChosen(false);
		rim.set(withTiming(0, { duration: HERO.drainMs, easing: EASE_DRAIN }));
		rimOpacity.set(
			withTiming(1, { duration: HERO.rimFadeMs, easing: EASE_CSS })
		);
		body.set(withTiming(1, { duration: HERO.bodyOutMs, easing: EASE_CSS }));
	};

	return {
		body,
		choose,
		chosen,
		holdable,
		pressIn,
		pressOut,
		release,
		rest,
		rim,
		rimOpacity,
		scale,
		sweep,
		unchoose,
	};
}

export type Hold = ReturnType<typeof useHold>;
