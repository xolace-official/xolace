import { useEffect } from "react";
import {
	Easing,
	type SharedValue,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { SETTLED } from "../first-look-model";

/**
 * A preview's act: ms since its row opened, played once per opening and read by every moving
 * part on the UI thread. Under Reduce Motion it holds the end.
 */
export function useAct(
	open: boolean,
	reduced: boolean,
	ms: number
): SharedValue<number> {
	const act = useSharedValue(reduced ? SETTLED : 0);
	useEffect(() => {
		if (!open) {
			return;
		}
		if (reduced) {
			act.set(SETTLED);
			return;
		}
		act.set(0);
		act.set(
			withTiming(ms, { duration: ms, easing: Easing.linear, ...PLAY_AS_CHOSEN })
		);
	}, [act, ms, open, reduced]);
	return act;
}
