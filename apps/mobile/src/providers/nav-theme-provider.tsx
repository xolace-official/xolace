import {
	DarkTheme,
	DefaultTheme,
	type Theme,
	ThemeProvider,
} from "expo-router/react-navigation";
import * as SystemUI from "expo-system-ui";
import { useThemeColor } from "heroui-native";
import { type ReactNode, useEffect } from "react";
import { Appearance } from "react-native";
import { useUniwind } from "uniwind";
import { useAppStore } from "@/store/store";

// Single source of truth for the native route background: the navigator paints every screen
// container with the nav theme's colors before JS content mounts, so no stock grey/white edge.
export function NavThemeProvider({ children }: { children: ReactNode }) {
	const { theme } = useUniwind();
	const [background, foreground, border, accent] = useThemeColor([
		"background",
		"foreground",
		"border",
		"accent",
	]);
	const isDark = theme.includes("dark");
	const base = isDark ? DarkTheme : DefaultTheme;

	const navTheme: Theme = {
		...base,
		colors: {
			...base.colors,
			background,
			border,
			card: background,
			primary: accent,
			text: foreground,
		},
		// Navigator-rendered text (headers, back labels) uses the app face. The
		// nominal weight comes first so a face carrying its own weight wins.
		fonts: {
			bold: { fontFamily: "SpaceGrotesk_600SemiBold", fontWeight: "600" },
			heavy: { fontFamily: "SpaceGrotesk_700Bold", fontWeight: "700" },
			medium: { fontFamily: "SpaceGrotesk_500Medium", fontWeight: "500" },
			regular: { fontFamily: "SpaceGrotesk_400Regular", fontWeight: "400" },
		},
	};

	// Keep the native root view / window (launch, overscroll bounce, transparent
	// sheets) in sync with the theme too.
	useEffect(() => {
		SystemUI.setBackgroundColorAsync(background);
	}, [background]);

	// Native chrome (glass sheets, alerts, keyboards) follows the OS appearance, not the theme. Force it for an
	// explicit choice; "system" with the default palette stays unspecified so the OS listener keeps working. A
	// colour theme in system mode is already frozen at launch (theme-bootstrap), so force it too.
	const mode = useAppStore((s) => s.theme);
	const colorThemeId = useAppStore((s) => s.colorThemeId);
	const followsOS = mode === "system" && colorThemeId === "default";
	useEffect(() => {
		Appearance.setColorScheme(
			followsOS ? "unspecified" : isDark ? "dark" : "light"
		);
	}, [followsOS, isDark]);

	return <ThemeProvider value={navTheme}>{children}</ThemeProvider>;
}
