import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { NativeStackNavigationOptions } from "expo-router";
import { Platform } from "react-native";
import { useThemeFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { useTokenColor } from "@/lib/use-token-color";

export function useHeaderOptions(
	size: "large" | "small" = "large"
): NativeStackNavigationOptions {
	const foreground = useTokenColor("foreground");
	const background = useTokenColor("background");
	const faces = useThemeFaces();
	const dark = useScheme() === "dark";
	const titleStyle = { color: foreground, fontFamily: faces["display-bold"] };

	if (Platform.OS === "android") {
		return {
			contentStyle: { backgroundColor: background },
			headerShadowVisible: false,
			headerStyle: { backgroundColor: background },
			headerTintColor: foreground,
			headerTitleStyle: titleStyle,
		};
	}

	const glass = isLiquidGlassAvailable();
	const blur = dark ? "dark" : "light";
	return {
		contentStyle: { backgroundColor: background },
		headerBackButtonDisplayMode: "minimal",
		headerBlurEffect: glass ? undefined : blur,
		headerLargeStyle: { backgroundColor: "transparent" },
		headerLargeTitle: size === "large",
		headerLargeTitleShadowVisible: false,
		headerLargeTitleStyle: { color: foreground, fontFamily: faces.display },
		headerShadowVisible: false,
		headerTintColor: foreground,
		headerTitleStyle: titleStyle,
		headerTransparent: true,
		scrollEdgeEffects: glass ? { top: "soft" } : undefined,
	};
}
