import {
	useAnimatedReaction,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import type { KeyboardLift } from "@/lib/keyboard/use-keyboard-lift";

/** Send, riding over the keyboard. */
export const SEND = { height: 52, side: 16 };
/** With the keyboard up, the count sits at least this far above Send. */
const ABOVE_SEND = 8;

/**
 * The keyboard rule for the letter: with the keyboard up, it lifts just enough to keep its count
 * clear of Send. The lift counts from where the scroll was as the keyboard came up, so scrolling
 * afterwards moves the letter instead of being undone by the lift.
 */
export function useLetterLift({
	lift,
	height,
	top,
}: {
	lift: KeyboardLift;
	/** The screen's height. */
	height: number;
	/** Where the content starts, under the header. */
	top: number;
}) {
	// The count's foot, measured: the check's line and the letter grow with Dynamic Type.
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
