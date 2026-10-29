import Constants from "expo-constants";
import { useEffect } from "react";
import {
	getAppInfoFromTheStore,
	shouldUpdateApp,
} from "../utils/version-check";

type UseVersionCheckOptions = {
	/** Called when the check completes, with whether the store has a newer version. */
	onVersionChecked: (isNewVersionAvailable: boolean) => void;
};

/** Checks the store for a newer version on mount. Skipped in development builds. */
export function useVersionCheck({ onVersionChecked }: UseVersionCheckOptions) {
	useEffect(() => {
		if (__DEV__) {
			return;
		}

		let cancelled = false;

		const checkForUpdate = async () => {
			try {
				const result = await getAppInfoFromTheStore();
				const newestVersion = result?.version;
				const installedVersion = Constants.expoConfig?.version;

				if (cancelled) {
					return;
				}

				if (
					installedVersion &&
					newestVersion &&
					shouldUpdateApp(installedVersion, newestVersion)
				) {
					onVersionChecked(true);
				} else {
					onVersionChecked(false);
				}
			} catch (error) {
				console.log("[useVersionCheck] Failed to check for updates:", error);
				if (!cancelled) {
					onVersionChecked(false);
				}
			}
		};

		checkForUpdate();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}
