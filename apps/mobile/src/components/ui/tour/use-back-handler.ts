import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

/** Runs `onBack` on Android hardware back while `enabled`, consuming the press so the screen
 * does not pop. */
export function useBackHandler(enabled: boolean, onBack: () => void): void {
	// A ref, so an inline handler does not resubscribe every render; only `enabled` does.
	const onBackRef = useRef(onBack);
	useEffect(() => {
		onBackRef.current = onBack;
	});

	useEffect(() => {
		if (Platform.OS !== "android" || !enabled) {
			return;
		}

		const subscription = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				onBackRef.current();
				return true;
			}
		);

		return () => subscription.remove();
	}, [enabled]);
}
