import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { NativeStackNavigationOptions } from "expo-router";
import { Platform } from "react-native";
import { useThemeFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { useTokenColor } from "@/lib/use-token-color";

/**
 * The redesign's native header: `useLargeHeaderOptions` (navigation-options.tsx,
 * kept for the old screens) in the theme's heading faces. iOS: a see-through
 * header; on iOS 26 content fades softly under it (`scrollEdgeEffects`), before
 * that the bar blurs, never both. Android: a plain themed header.
 *
 * The soft edge needs the screen's scroll view as its first descendant, with
 * `contentInsetAdjustmentBehavior="automatic"`, and no hand-made top padding.
 *
 * `large` gives the large title that collapses on scroll; `small` is a
 * sub-screen's small title. Both keep the minimal back button.
 */
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
		// Opaque: on iOS 18 a transparent contentStyle lets the outgoing screen
		// bleed through the pushed one for the whole transition.
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
