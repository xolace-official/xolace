import Constants from "expo-constants";
import { usePathname } from "expo-router";
import { useAppTheme } from "@/context/app-theme-context";

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
