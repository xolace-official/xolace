import { useEffect, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Presets } from "react-native-pulsar";
import {
	Easing,
	useAnimatedReaction,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PLAY_AS_CHOSEN, press } from "@/design/springs";
import { playSessionComplete } from "@/lib/haptics";
import { EASE_CSS, EASE_CSS_OUT, EASE_DRAIN } from "../today-motion";
import {
	canChoose,
	canTap,
	DOORS,
	doorsLandMs,
	HERO,
	HOLD_REST,
	type HoldEvent,
	holdNext,
} from "./hero-model";

const tick = () => Presets.System.selection();

export function useHold(reduced: boolean, holdable: boolean) {
	const [chosen, setChosen] = useState(false);
	const rim = useSharedValue(0);
	const rimOpacity = useSharedValue(1);
	const scale = useSharedValue(1);
	const body = useSharedValue(1);
	const holding = useSharedValue(false);
	const swept = useRef(false);
	const bloom = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => () => clearTimeout(bloom.current), []);
	const touch = useRef(HOLD_REST);
	const step = (e: HoldEvent) => {
		const before = touch.current;
		touch.current = holdNext(before, e);
		return before;
	};
	const at = (e: GestureResponderEvent) => ({
		x: e.nativeEvent.pageX,
		y: e.nativeEvent.pageY,
	});

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

	const pressIn = (e: GestureResponderEvent) => {
		step({ type: "in", ...at(e) });
		if (chosen) {
			return;
		}
		swept.current = false;
		scale.set(press(HERO.holdScale, reduced));
		if (!holdable) {
			return;
		}
		holding.set(true);
		rim.set(
			withTiming(1, {
				duration: HERO.holdMs,
				easing: Easing.linear,
				...PLAY_AS_CHOSEN,
			})
		);
	};

	const pressMove = (e: GestureResponderEvent) => {
		const before = step({ type: "move", ...at(e) });
		if (before.phase !== "holding" || touch.current.phase !== "drifted") {
			return;
		}
		holding.set(false);
		scale.set(press(1, reduced));
		rim.set(
			withTiming(0, {
				duration: HERO.drainMs,
				easing: EASE_DRAIN,
				...PLAY_AS_CHOSEN,
			})
		);
	};

	const pressOut = () => {
		step({ type: "out" });
		holding.set(false);
		scale.set(press(1, reduced));
		if (!(chosen || swept.current)) {
			rim.set(
				withTiming(0, {
					duration: HERO.drainMs,
					easing: EASE_DRAIN,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	};

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
				...PLAY_AS_CHOSEN,
			})
		);
	};

	const release = () => {
		if (!swept.current) {
			return;
		}
		rimOpacity.set(
			withDelay(
				HERO.releaseDelayMs,
				withTiming(0, {
					duration: HERO.drainMs,
					easing: EASE_DRAIN,
					...PLAY_AS_CHOSEN,
				}),
				PLAY_AS_CHOSEN.reduceMotion
			)
		);
	};

	const rest = () => {
		if (!swept.current) {
			return;
		}
		swept.current = false;
		rim.set(0);
		rimOpacity.set(1);
	};

	const choose = (a11y = false) => {
		if (!(holdable && canChoose(touch.current, a11y))) {
			return;
		}
		step({ a11y, type: "choose" });
		holding.set(false);
		setChosen(true);
		rim.set(1);
		rimOpacity.set(
			withTiming(HERO.chosenRim, {
				duration: HERO.rimFadeMs,
				easing: EASE_CSS,
				...PLAY_AS_CHOSEN,
			})
		);
		body.set(
			withTiming(0, {
				duration: HERO.bodyOutMs,
				easing: EASE_CSS,
				...PLAY_AS_CHOSEN,
			})
		);
		bloom.current = setTimeout(
			playSessionComplete,
			reduced ? 0 : doorsLandMs(DOORS.length)
		);
	};

	const unchoose = () => {
		step({ type: "unchoose" });
		clearTimeout(bloom.current);
		setChosen(false);
		rim.set(
			withTiming(0, {
				duration: HERO.drainMs,
				easing: EASE_DRAIN,
				...PLAY_AS_CHOSEN,
			})
		);
		rimOpacity.set(
			withTiming(1, {
				duration: HERO.rimFadeMs,
				easing: EASE_CSS,
				...PLAY_AS_CHOSEN,
			})
		);
		body.set(
			withTiming(1, {
				duration: HERO.bodyOutMs,
				easing: EASE_CSS,
				...PLAY_AS_CHOSEN,
			})
		);
	};

	return {
		body,
		choose,
		chooseFromA11y: () => choose(true),
		chosen,
		holdable,
		pressIn,
		pressMove,
		pressOut,
		release,
		rest,
		rim,
		rimOpacity,
		scale,
		sweep,
		tapAllowed: () => canTap(touch.current),
		unchoose,
	};
}

export type Hold = ReturnType<typeof useHold>;
