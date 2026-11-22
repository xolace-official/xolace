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
	bottom: SharedValue<number>;
	rest: number;
	keyboard: SharedValue<number>;
	progress: SharedValue<number>;
};

export function useKeyboardLift(): KeyboardLift {
	const insets = useSafeAreaInsets();
	const rest = restFor(insets.bottom);
	const { height, progress } = useReanimatedKeyboardAnimation();
	const keyboard = useDerivedValue(() => keyboardHeight(height.get()));
	const bottom = useDerivedValue(() => liftBottom(rest, keyboard.get()));
	return { bottom, keyboard, progress, rest };
}

export function useLiftStyle(lift: KeyboardLift) {
	const { bottom, rest } = lift;
	return useAnimatedStyle(() => ({
		transform: [{ translateY: rest - bottom.get() }],
	}));
}
