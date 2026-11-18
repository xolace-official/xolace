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

/** Per star (index = star k): every value a press drives, each on the UI thread. */
export type StarValues = {
	/** The line going hot (.45 s on, .7 s cool). */
	hot: SharedValue<number>[];
	/** The star's halo going hot (.5 s, bezier(.34, 1.4, .64, 1)). */
	hotS: SharedValue<number>[];
	/** Reported or hidden: line and star fade (.4 s). */
	gone: SharedValue<number>[];
	/** ms since this star's blink began (negative while it waits its turn). */
	blink: SharedValue<number>[];
	/** The point of light along this line, 0 → 1 over .62 s. */
	pl: SharedValue<number>[];
};

/** Four of a value, one per star (hooks can't loop, so they're written out). */
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

/**
 * The values a press sends to the mark, and the moves that drive them, all on
 * the UI thread (board `tap`, `.hot`, `.cool`, `.off`, `.pl`, `.bk`). React only
 * says what happened.
 */
export function useStarValues(reduced: boolean) {
	const stars: StarValues = {
		blink: useFour(TIMING.blink),
		gone: useFour(),
		hot: useFour(),
		hotS: useFour(),
		pl: useFour(),
	};

	/** Star k's line and halo go hot or cool (.45 s on; the line cools over .7 s, the halo .5 s). */
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

	/**
	 * A turn-on: a point of light runs from you to star k (.62 s), and every
	 * other landed star blinks once, in a wave rolling out from k at 240 pt/s
	 * after .6 s. None of it under Reduce Motion.
	 */
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

	/** Reported or hidden: the line and the star go out (.4 s), or at once on a visit's start. */
	const putOut = (k: number, now: boolean) => {
		stars.gone[k].set(
			now ? 1 : withTiming(1, timed(reduced ? REDUCED_FADE_MS : TIMING.gone))
		);
	};

	return { heat, putOut, send, stars };
}
