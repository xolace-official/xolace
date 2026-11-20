import { useEffect } from "react";
import {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import type { TwigState } from "../kindling-model";
import { KMOTION } from "../kindling-motion";

const PASSED_TONE = 0;
const PASSED_ALPHA = 0.45;
const DIM_TONE = 0.55;
const DIM_VEIL = 0.55;
const DIM_LABEL = 0.45;
const PASSED_LABEL = 0.6;
const EMBER_HALO = 0.1;

export function useStopMotion(
	state: TwigState,
	open: boolean,
	dim: boolean,
	reduced: boolean
) {
	const done = state === "done";
	const passed = state === "passed" || state === "undo";
	const lit = useSharedValue(done ? 1 : 0);
	const badge = useSharedValue(done ? 1 : 0);
	const opened = useSharedValue(open ? 1 : 0);
	const tone = useSharedValue(passed ? PASSED_TONE : dim ? DIM_TONE : 1);
	const alpha = useSharedValue(passed ? PASSED_ALPHA : 1);
	const veil = useSharedValue(dim ? DIM_VEIL : 0);
	const label = useSharedValue(dim ? DIM_LABEL : passed ? PASSED_LABEL : 1);

	useEffect(() => {
		const fade = { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN };
		lit.set(
			withTiming(
				done ? 1 : 0,
				reduced
					? fade
					: { duration: KMOTION.litMs, easing: KMOTION.lit, ...PLAY_AS_CHOSEN }
			)
		);
		if (!done) {
			badge.set(0);
		} else if (reduced) {
			badge.set(withTiming(1, fade));
		} else {
			badge.set(withSpring(1, { ...KMOTION.badge, ...PLAY_AS_CHOSEN }));
		}
	}, [badge, done, lit, reduced]);

	useEffect(() => {
		let ms: number = KMOTION.liftMs;
		if (reduced) {
			ms = REDUCED_FADE_MS;
		} else if (dim) {
			ms = KMOTION.dimMs;
		}
		const ease = { duration: ms, ...PLAY_AS_CHOSEN };
		const veiled = dim && !passed;
		if (passed) {
			tone.set(PASSED_TONE);
			alpha.set(PASSED_ALPHA);
		} else {
			tone.set(withTiming(dim ? DIM_TONE : 1, ease));
			alpha.set(withTiming(1, ease));
		}
		veil.set(withTiming(veiled ? DIM_VEIL : 0, ease));
		label.set(withTiming(veiled ? DIM_LABEL : passed ? PASSED_LABEL : 1, ease));
	}, [alpha, dim, label, passed, reduced, tone, veil]);

	useEffect(() => {
		opened.set(
			withTiming(open ? 1 : 0, {
				duration: reduced ? REDUCED_FADE_MS : KMOTION.openMs,
				easing: KMOTION.lit,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [open, opened, reduced]);

	const scale = useAnimatedStyle(() => ({
		transform: [{ scale: 1 + (KMOTION.openScale - 1) * opened.get() }],
	}));
	const violetRing = useAnimatedStyle(() => ({
		opacity: opened.get() * (1 - lit.get()),
	}));
	const emberRing = useAnimatedStyle(() => ({ opacity: lit.get() }));
	const violetHalo = useAnimatedStyle(() => ({
		opacity: opened.get() * (1 - lit.get()),
	}));
	const emberHalo = useAnimatedStyle(() => ({
		opacity: EMBER_HALO * (1 + opened.get()) * lit.get(),
	}));
	return {
		alpha,
		badge,
		emberHalo,
		emberRing,
		label,
		scale,
		tone,
		veil,
		violetHalo,
		violetRing,
	};
}
