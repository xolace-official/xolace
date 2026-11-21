import { createContext, use, useState } from "react";
import {
	type SharedValue,
	useAnimatedReaction,
	useDerivedValue,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export type TodayFrameValue = {
	scrollY: SharedValue<number>;
	viewH: number;
	live: boolean;
	reduced: boolean;
	intro: boolean;
	waiting: boolean;
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

export function useOnScreen(
	top: SharedValue<number>,
	height: number
): SharedValue<boolean> {
	const { scrollY, viewH } = useTodayFrame();
	return useDerivedValue(() => {
		const y = scrollY.get();
		return top.get() < y + viewH && top.get() + height > y;
	});
}

export function useShown(onScreen: SharedValue<boolean>): boolean {
	const [shown, setShown] = useState(true);
	useAnimatedReaction(
		() => onScreen.get(),
		(now, before) => {
			if (now !== before) {
				scheduleOnRN(setShown, now);
			}
		}
	);
	return shown;
}

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
