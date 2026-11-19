import {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";

/** Board `.r:active`: `press .22s` down to .975 at 40%, then back. */
const PRESS = { at: 0.4, ms: 220, scale: 0.975 } as const;

/** A greeting row's press: the style to put on the row, and `play` for its tap (nothing under Reduce Motion). */
export function useRowPress(reduced: boolean) {
	const press = useSharedValue(1);
	const style = useAnimatedStyle(() => ({
		transform: [{ scale: press.get() }],
	}));
	const play = () => {
		if (reduced) {
			return;
		}
		const down = PRESS.ms * PRESS.at;
		press.set(
			withSequence(
				withTiming(PRESS.scale, { duration: down, ...PLAY_AS_CHOSEN }),
				withTiming(1, { duration: PRESS.ms - down, ...PLAY_AS_CHOSEN })
			)
		);
	};
	return { play, style };
}
