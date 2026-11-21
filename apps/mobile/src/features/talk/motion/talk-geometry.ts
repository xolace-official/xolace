import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BOARD, LAYOUT } from "./talk-motion";

export function useTalkGeometry() {
	const { width, height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const dTop = insets.top - BOARD.status;
	const dBottom = insets.bottom - BOARD.home;
	const extra = height - BOARD.height - dTop - dBottom;
	const stageY = LAYOUT.stageCentre + dTop + extra / 2;
	const composerTop =
		height - insets.bottom - LAYOUT.composerGap - LAYOUT.composerH;
	return {
		captionTop: stageY + LAYOUT.captionBelow,
		composerTop,
		headerTop: insets.top + LAYOUT.headerTop,
		height,
		insets,
		pillFace: {
			x: width / 2 + LAYOUT.pillFaceDx,
			y: insets.top + LAYOUT.pillTop + LAYOUT.pillH / 2,
		},
		pillTop: insets.top + LAYOUT.pillTop,
		stageY,
		startTop:
			height -
			insets.bottom -
			LAYOUT.footBottom -
			LAYOUT.footH -
			LAYOUT.footGap -
			LAYOUT.startH,
		switchTop: insets.top + LAYOUT.switchTop,
		width,
	};
}

export type TalkGeometry = ReturnType<typeof useTalkGeometry>;
