import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

export function useBackHandler(enabled: boolean, onBack: () => void): void {
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
