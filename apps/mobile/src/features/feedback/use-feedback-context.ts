import Constants from "expo-constants";
import { usePathname } from "expo-router";
import { useAppTheme } from "@/context/app-theme-context";

/** Submission context for a `product_feedback` row — triage without content. `route` is the
 * screen it was raised on when that isn't this one (the feedback sheet passes its `from`). */
export function useFeedbackContext(route?: string) {
	const pathname = usePathname();
	const { currentTheme } = useAppTheme();
	return {
		appVersion: Constants.expoConfig?.version ?? "",
		platform: process.env.EXPO_OS ?? "",
		route: route ?? pathname,
		themeName: currentTheme,
	};
}
