import Constants from "expo-constants";
import { usePathname } from "expo-router";
import { useAppTheme } from "@/context/app-theme-context";

/** Submission context for a `product_feedback` row — triage without content. */
export function useFeedbackContext() {
	const pathname = usePathname();
	const { currentTheme } = useAppTheme();
	return {
		appVersion: Constants.expoConfig?.version ?? "",
		platform: process.env.EXPO_OS ?? "",
		route: pathname,
		themeName: currentTheme,
	};
}
