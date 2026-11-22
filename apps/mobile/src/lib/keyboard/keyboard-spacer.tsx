import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useKeyboardLift } from "@/lib/keyboard/use-keyboard-lift";

export function KeyboardSpacer() {
	const lift = useKeyboardLift();
	const style = useAnimatedStyle(() => ({
		height: lift.bottom.get() - lift.rest,
	}));
	return <Animated.View pointerEvents="none" style={style} />;
}
