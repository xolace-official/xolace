import { useNavigation, usePreventZoomTransitionDismissal } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { canAppleZoom } from "@/lib/apple-zoom";
import { useBoardY } from "../layout";
import { useReflect } from "../reflect-data";

const MIRROR_DISMISS_MAX_Y = 240;

/**
 * The system's ways out of Reflect, per stage.
 *
 * - **Mirror:** a line takes a drag to the right (Not quite). Two system gestures would take it
 *   first and close Reflect: iOS 26's full-screen swipe back, and the zoom's interactive
 *   dismissal. The first is off and the second may only begin above the lines, so a swipe down
 *   from the top still tucks Reflect into the card.
 * - **Heard:** the session has ended, so going back to Today would skip its end. Swipe-back and
 *   the zoom's dismissal are off (`gestureEnabled: false` blocks both), and Android's back goes
 *   where ✕ and Continue do: the session's end.
 */
export function useStageGestures() {
	const { state, actions } = useReflect();
	const navigation = useNavigation();
	const y = useBoardY();
	const mirror = state.stage === "mirror";
	const heard = state.stage === "heard";

	useEffect(() => {
		navigation.setOptions({
			fullScreenSwipeEnabled: !mirror,
			gestureEnabled: !heard,
		});
	}, [navigation, mirror, heard]);
	// Before iOS 18 there is no zoom to dismiss, and a bounds rect would only turn swipe-back off.
	usePreventZoomTransitionDismissal(
		mirror && canAppleZoom()
			? { unstable_dismissalBoundsRect: { maxY: y(MIRROR_DISMISS_MAX_Y) } }
			: undefined
	);

	const finish = actions.finish;
	useEffect(() => {
		if (!heard) {
			return;
		}
		const sub = BackHandler.addEventListener("hardwareBackPress", () => {
			finish();
			return true;
		});
		return () => sub.remove();
	}, [heard, finish]);
}
