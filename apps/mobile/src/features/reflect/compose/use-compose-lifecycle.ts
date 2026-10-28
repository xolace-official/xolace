import { useNavigation } from "expo-router";
import { useEffect, useRef } from "react";
import { playHomeEntrance } from "@/lib/haptics";

/**
 * Mount-and-leave concerns: the entrance haptic in Flux's mount frame, never on an outgoing copy.
 */
export const useComposeLifecycle = (
	focusOnExpand: boolean,
	tourActive: boolean,
	skipTour: () => void
) => {
	const navigation = useNavigation();

	// Dismiss the tour if the user navigates away.
	useEffect(() => {
		const unsub = navigation.addListener("blur", () => {
			if (tourActive) {
				skipTour();
			}
		});
		return unsub;
	}, [navigation, tourActive, skipTour]);

	const entranceFired = useRef(false);
	useEffect(() => {
		if (entranceFired.current || !focusOnExpand) {
			return;
		}
		entranceFired.current = true;
		playHomeEntrance();
	}, [focusOnExpand]);
};
