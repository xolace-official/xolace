import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { NativeStackNavigationOptions } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Platform } from "react-native";
import { useAppTheme } from "@/context/app-theme-context";

/** Header options: iOS large transparent header with blur/glass; Android standard themed header. */
export function useLargeHeaderOptions(): NativeStackNavigationOptions {
	const headerTintColor = useThemeColor("foreground");
	const backgroundColor = useThemeColor("background");
	const { isDark } = useAppTheme();

	if (Platform.OS === "android") {
		return {
			contentStyle: { backgroundColor },
			headerShadowVisible: false,
			headerStyle: { backgroundColor },
			headerTintColor,
		};
	}

	const isGlassAvailable = isLiquidGlassAvailable();

	return {
		// Opaque: on iOS 18 react-native-screens honours a transparent contentStyle literally,
		// so the outgoing screen bleeds through the pushed one for the whole transition.
		contentStyle: { backgroundColor },
		// Chevron only — matches the icon-only toolbar back on each stack root.
		headerBackButtonDisplayMode: "minimal",
		headerBlurEffect: isGlassAvailable ? undefined : isDark ? "dark" : "light",
		headerLargeStyle: {
			backgroundColor: "transparent",
		},
		headerLargeTitle: true,
		headerLargeTitleStyle: {
			color: headerTintColor,
		},
		headerTintColor,
		headerTitleStyle: {
			color: headerTintColor,
		},
		headerTransparent: true,
		// iOS 26: content fades softly under the glass header. Never alongside
		// headerBlurEffect — the two overlap. Needs the scroll view to be the
		// screen's first descendant to find it.
		scrollEdgeEffects: isGlassAvailable ? { top: "soft" } : undefined,
	};
}
