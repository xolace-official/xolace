import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import {
	type SharedValue,
	useAnimatedStyle,
	useDerivedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	keyboardHeight,
	liftBottom,
	restFor,
} from "@/lib/keyboard/keyboard-lift-math";

export type KeyboardLift = {
	/** The bar's bottom edge above the screen's bottom, live. */
	bottom: SharedValue<number>;
	/** Where it rests with the keyboard down: the safe-area inset. */
	rest: number;
	/** The keyboard's height, 0 when down. */
	keyboard: SharedValue<number>;
	/** 0 with the keyboard down … 1 fully up. */
	progress: SharedValue<number>;
};

/**
 * The keyboard rule (`keyboard-lift-math.ts`), frame by frame on the UI thread
 * on the keyboard's own curve, interactive dismissal included:
 * react-native-keyboard-controller reports the keyboard's live height.
 */
export function useKeyboardLift(): KeyboardLift {
	const insets = useSafeAreaInsets();
	const rest = restFor(insets.bottom);
	const { height, progress } = useReanimatedKeyboardAnimation();
	const keyboard = useDerivedValue(() => keyboardHeight(height.get()));
	const bottom = useDerivedValue(() => liftBottom(rest, keyboard.get()));
	return { bottom, keyboard, progress, rest };
}

/**
 * For a bar laid out at `bottom: rest`: lifts it with the keyboard by a
 * transform, so no layout pass runs per frame.
 *
 * @public For the redesign's composers (Reflect, Letters, Talk), from their S-PRs.
 */
export function useLiftStyle(lift: KeyboardLift) {
	const { bottom, rest } = lift;
	return useAnimatedStyle(() => ({
		transform: [{ translateY: rest - bottom.get() }],
	}));
}
