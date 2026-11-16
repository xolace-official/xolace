import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BOARD, LAYOUT } from "./talk-motion";

/**
 * Where the talk's pieces sit on this phone, from the board's numbers (handoff §4). The
 * header follows the status bar; the stage takes half of any extra height, so on a taller
 * phone the face stays centred between the switch and the caption, as production's flex
 * stage does.
 */
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
		/** The composer's top with the keyboard down. */
		composerTop,
		headerTop: insets.top + LAYOUT.headerTop,
		height,
		insets,
		/** The pill's face centre: the hero flies here when the talk opens in Conversation. */
		pillFace: {
			x: width / 2 + LAYOUT.pillFaceDx,
			y: insets.top + LAYOUT.pillTop + LAYOUT.pillH / 2,
		},
		pillTop: insets.top + LAYOUT.pillTop,
		/** The stage face's centre, and the presence word and caption under it. */
		stageY,
		/** The Start button's top on a screen whose content fits (board 684 = 844 − 34 − 126). */
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
