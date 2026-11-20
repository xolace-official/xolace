import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { NativeStackNavigationOptions } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Platform } from "react-native";
import { useAppTheme } from "@/context/app-theme-context";

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
		contentStyle: { backgroundColor },
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
		scrollEdgeEffects: isGlassAvailable ? { top: "soft" } : undefined,
	};
}
