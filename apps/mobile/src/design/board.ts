import { useSafeAreaInsets } from "react-native-safe-area-context";

const BOARD_STATUS = 47;

export function useBoardY(): (y: number) => number {
	const { top } = useSafeAreaInsets();
	return (y) => top - BOARD_STATUS + y;
}
