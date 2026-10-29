import Constants from "expo-constants";
import { Platform } from "react-native";

const bundleInfo = Platform.select({
	android: {
		id: Constants.expoConfig?.android?.package ?? "com.your-app-name.android",
	},
	ios: {
		id: Constants.expoConfig?.ios?.bundleIdentifier ?? "com.your-app-name.app",
	},
});

interface AppInfoFromStore {
	storeUrl: string;
	version: string;
}

/** Latest app info from the iTunes lookup API. */
async function getInfoFromAppStore(
	country = ""
): Promise<AppInfoFromStore | null> {
	try {
		const response = await fetch(
			`https://itunes.apple.com/lookup?bundleId=${bundleInfo?.id}&country=${country}`,
			{ cache: "no-store" }
		);

		const data = (await response.json()) as {
			results: { trackViewUrl: string; version: string }[];
		};

		const firstResult = data.results[0];
		if (!firstResult) {
			return null;
		}

		return {
			storeUrl: firstResult.trackViewUrl ?? "",
			version: firstResult.version ?? "",
		};
	} catch {
		return null;
	}
}

/** Latest app info scraped from the Play Store page HTML; tries two known layout patterns. */
async function getInfoFromPlayStore(
	_country = ""
): Promise<AppInfoFromStore | null> {
	try {
		const storeUrl = `https://play.google.com/store/apps/details?id=${bundleInfo?.id}&hl=en&gl=US`;
		const response = await fetch(storeUrl, { cache: "no-store" });
		const html = await response.text();

		const match =
			html.match(/Current Version.+?>([\d.-]+)<\/span>/) ??
			html.match(/\[\[\["([\d-.]+?)"\]\]/);

		if (match) {
			return { storeUrl, version: match[1].trim() };
		}

		return null;
	} catch {
		return null;
	}
}

/** Platform-aware store lookup. */
export async function getAppInfoFromTheStore(
	country = ""
): Promise<AppInfoFromStore | null> {
	const selectedFunction = Platform.select({
		android: getInfoFromPlayStore,
		ios: getInfoFromAppStore,
	});

	if (selectedFunction) {
		return selectedFunction(country);
	}

	return null;
}

/** True when `newestVersion` is strictly greater than `installedVersion` (semver-style). */
export function shouldUpdateApp(
	installedVersion: string,
	newestVersion: string
): boolean {
	if (!(installedVersion && newestVersion)) {
		return false;
	}

	const installed = installedVersion.split(".").map(Number);
	const newest = newestVersion.split(".").map(Number);

	for (let i = 0; i < Math.max(installed.length, newest.length); i++) {
		const installedPart = installed[i] ?? 0;
		const newestPart = newest[i] ?? 0;

		if (installedPart < newestPart) {
			return true;
		}
		if (installedPart > newestPart) {
			return false;
		}
	}

	return false;
}
