import { useEffect, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";

/**
 * Whether the app is in the foreground. Only a real trip to the background counts, as in the
 * connection provider: iOS passes through "inactive" for Control Center without leaving.
 */
export function useAppActive(): boolean {
	const [active, setActive] = useState(
		() => AppState.currentState !== "background"
	);
	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "background") {
				setActive(false);
			} else if (state === "active") {
				setActive(true);
			}
		});
		return () => sub.remove();
	}, []);
	return active;
}

/** Whether VoiceOver or TalkBack is on, so an announcement is heard. */
export function useScreenReaderOn(): boolean {
	const [on, setOn] = useState(false);
	useEffect(() => {
		let changed = false;
		const sub = AccessibilityInfo.addEventListener(
			"screenReaderChanged",
			(enabled) => {
				changed = true;
				setOn(enabled);
			}
		);
		AccessibilityInfo.isScreenReaderEnabled()
			.then((enabled) => {
				// A change event that landed first is newer than this reading.
				if (!changed) {
					setOn(enabled);
				}
			})
			.catch(() => undefined);
		return () => {
			changed = true;
			sub.remove();
		};
	}, []);
	return on;
}
