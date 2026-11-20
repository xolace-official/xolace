import {
	Easing,
	type SharedValue,
	useSharedValue,
	type WithTimingConfig,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { EASE } from "../peers-ease";
import { TIMING } from "../peers-look";
import { waveDelay } from "./mark-geo";

export type StarValues = {
	hot: SharedValue<number>[];
	hotS: SharedValue<number>[];
	gone: SharedValue<number>[];
	blink: SharedValue<number>[];
	pl: SharedValue<number>[];
};

function useFour(initial = 0) {
	const a = useSharedValue(initial);
	const b = useSharedValue(initial);
	const c = useSharedValue(initial);
	const d = useSharedValue(initial);
	return [a, b, c, d];
}

const timed = (
	duration: number,
	easing?: WithTimingConfig["easing"]
): WithTimingConfig => ({
	duration,
	// An `easing: undefined` would replace the default curve with nothing.
	...(easing ? { easing } : {}),
	...PLAY_AS_CHOSEN,
});

export function useStarValues(reduced: boolean) {
	const stars: StarValues = {
		blink: useFour(TIMING.blink),
		gone: useFour(),
		hot: useFour(),
		hotS: useFour(),
		pl: useFour(),
	};

	const heat = (k: number, on: boolean) => {
		const lineMs = on ? TIMING.hotOn : TIMING.cool;
		stars.hot[k].set(
			withTiming(
				on ? 1 : 0,
				timed(reduced ? REDUCED_FADE_MS : lineMs, EASE.css)
			)
		);
		stars.hotS[k].set(
			withTiming(
				on ? 1 : 0,
				timed(
					reduced ? REDUCED_FADE_MS : TIMING.halo,
					reduced ? EASE.css : EASE.halo
				)
			)
		);
	};

	const send = (k: number, others: readonly number[]) => {
		if (reduced) {
			return;
		}
		stars.pl[k].set(0);
		stars.pl[k].set(withTiming(1, timed(TIMING.pl, Easing.linear)));
		for (const j of others) {
			const delay = waveDelay(k, j);
			stars.blink[j].set(-delay);
			stars.blink[j].set(
				withTiming(TIMING.blink, timed(TIMING.blink + delay, Easing.linear))
			);
		}
	};

	const putOut = (k: number, now: boolean) => {
		stars.gone[k].set(
			now ? 1 : withTiming(1, timed(reduced ? REDUCED_FADE_MS : TIMING.gone))
		);
	};

	return { heat, putOut, send, stars };
}
