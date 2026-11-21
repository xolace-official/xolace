import {
	useAnimatedReaction,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import type { KeyboardLift } from "@/lib/keyboard/use-keyboard-lift";

export const SEND = { height: 52, side: 16 };
const ABOVE_SEND = 8;

export function useLetterLift({
	lift,
	height,
	top,
}: {
	lift: KeyboardLift;
	height: number;
	top: number;
}) {
	const countFoot = useSharedValue(0);
	const scrollY = useSharedValue(0);
	const scrollAtLift = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollY.set(e.contentOffset.y);
	});
	useAnimatedReaction(
		() => lift.keyboard.get() > 0,
		(up, was) => {
			if (up && !was) {
				scrollAtLift.set(scrollY.get());
			}
		}
	);
	const contentStyle = useAnimatedStyle(() => {
		const sendTop = height - lift.bottom.get() - SEND.height;
		const foot = top + countFoot.get() - scrollAtLift.get();
		const over = Math.max(0, foot + ABOVE_SEND - sendTop);
		return { transform: [{ translateY: lift.keyboard.get() > 0 ? -over : 0 }] };
	});
	return {
		contentStyle,
		onCountFoot: (y: number) => countFoot.set(y),
		onScroll,
	};
}
