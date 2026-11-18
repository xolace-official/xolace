import { createContext, use, useState } from "react";
import {
	type SharedValue,
	useAnimatedReaction,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/**
 * Today's screen state, shared by its parts: the scroll and the clocks' permissions.
 * Not data (that is `today-data.tsx`): nothing here reads or acts.
 */
export type TodayFrameValue = {
	/** The page's scroll offset, written only by the scroll worklet. */
	scrollY: SharedValue<number>;
	/** Visible height of the page, for on-screen checks. */
	viewH: number;
	/** Loops may run: focused, foreground, motion allowed. */
	live: boolean;
	reduced: boolean;
	/** First open of the day: modules rise, words gleam. */
	intro: boolean;
	/** The first-open quality gate failed: half the particles, no blurs. */
	low: boolean;
};

export const TodayFrame = createContext<TodayFrameValue | null>(null);

export function useTodayFrame(): TodayFrameValue {
	const frame = use(TodayFrame);
	if (!frame) {
		throw new Error("useTodayFrame outside Today");
	}
	return frame;
}

/** True once the page has scrolled past `at` (with `hysteresis` on the way back), as React state. */
export function useScrolledPast(
	scrollY: SharedValue<number>,
	at: number,
	hysteresis = 0
): boolean {
	const [past, setPast] = useState(false);
	const on = useSharedValue(false);
	useAnimatedReaction(
		() => scrollY.get(),
		(y) => {
			const now = on.get() ? y > at - hysteresis : y > at;
			if (now === on.get()) {
				return;
			}
			on.set(now);
			scheduleOnRN(setPast, now);
		}
	);
	return past;
}
