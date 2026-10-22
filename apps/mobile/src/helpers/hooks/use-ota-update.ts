import * as Updates from "expo-updates";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

type UseOtaUpdateOptions = {
	isVersionChecked: boolean;
	isNewVersionAvailable: boolean;
	onUpdateReady: () => void;
};

/**
 * Manages EAS OTA updates. Fetches available updates and notifies the layout
 * when one is ready to apply. Re-checks when the app returns to the foreground.
 * Skipped entirely in development builds.
 */
export function useOtaUpdate({
	isVersionChecked,
	isNewVersionAvailable,
	onUpdateReady,
}: UseOtaUpdateOptions) {
	const { isUpdateAvailable } = Updates.useUpdates();
	const appState = useRef(AppState.currentState);
	// isUpdateAvailable stays true once an update is downloaded, and nothing relaunches
	// the app to clear it, so without this the sheet reopens on every foreground.
	const hasNotified = useRef(false);

	const handleUpdate = useCallback(async () => {
		if (!(isUpdateAvailable && isVersionChecked) || isNewVersionAvailable) {
			return;
		}
		if (hasNotified.current) {
			return;
		}

		try {
			await Updates.fetchUpdateAsync();
			hasNotified.current = true;
			onUpdateReady();
		} catch (error) {
			console.log("[useOtaUpdate] Failed to fetch update:", error);
		}
	}, [
		isUpdateAvailable,
		isVersionChecked,
		isNewVersionAvailable,
		onUpdateReady,
	]);

	useEffect(() => {
		if (__DEV__) {
			return;
		}
		handleUpdate();
	}, [handleUpdate]);

	// Re-subscribed whenever handleUpdate changes so the foreground re-check never
	// runs a stale closure. appState is a ref, so its tracking survives re-subscription.
	useEffect(() => {
		if (__DEV__) {
			return;
		}

		const subscription = AppState.addEventListener("change", (nextAppState) => {
			if (
				appState.current?.match(/inactive|background/) &&
				nextAppState === "active"
			) {
				Updates.checkForUpdateAsync()
					.then(() => handleUpdate())
					.catch((error) => {
						console.log(
							"[useOtaUpdate] Failed to check for update on foreground:",
							error
						);
					});
			}
			appState.current = nextAppState;
		});

		return () => subscription.remove();
	}, [handleUpdate]);
}
