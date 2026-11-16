import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The board's phone is 390 × 844 with a 47 pt status bar. */
const BOARD_STATUS = 47;

/**
 * Board y (from the top of the board's phone) → this phone's y: values anchored
 * to the top keep their distance under the status bar (Reflect's `useBoardY`).
 */
export function useBoardY(): (y: number) => number {
	const { top } = useSafeAreaInsets();
	return (y) => top - BOARD_STATUS + y;
}
