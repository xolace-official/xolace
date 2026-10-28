import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useDerivedValue, withSpring } from "react-native-reanimated";

/** Spring-smoothed keyboard height as a reanimated offset, so the tray rides up with it. */
export const useKeyboardOffset = () => {
	const { height } = useReanimatedKeyboardAnimation();

	const keyboardAnimatedOffset = useDerivedValue(() =>
		withSpring(height.get(), {
			damping: 15,
			mass: 0.6,
			stiffness: 150,
		})
	);

	return {
		translateY: keyboardAnimatedOffset,
	};
};
