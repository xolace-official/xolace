import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useKeyboardLift } from "@/lib/keyboard/use-keyboard-lift";

/**
 * The keyboard rule for a screen laid out as a column whose last child is the
 * bar that sits on the keyboard, padded at the bottom by `rest` (the safe area).
 * This spacer, placed after the bar, grows by `max(0, kb + 12 − rest)`, so the
 * bar's bottom edge is `max(rest, kb + 12)`: exactly 12 pt over the keyboard,
 * never the inset and the keyboard both, and the content above gives way on the
 * keyboard's own curve, frame by frame.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function KeyboardSpacer() {
	const lift = useKeyboardLift();
	const style = useAnimatedStyle(() => ({
		height: lift.bottom.get() - lift.rest,
	}));
	return <Animated.View pointerEvents="none" style={style} />;
}
