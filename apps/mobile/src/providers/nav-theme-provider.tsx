import {
	DarkTheme,
	DefaultTheme,
	type Theme,
	ThemeProvider,
} from "expo-router/react-navigation";
import * as SystemUI from "expo-system-ui";
import { useThemeColor } from "heroui-native";
import { type ReactNode, useEffect } from "react";
import { useUniwind } from "uniwind";
import { useThemeFaces } from "@/design/fonts";
import { findVariant } from "@/design/themes";
import { setNativeAppearance } from "@/lib/native-appearance";
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
	const faces = useThemeFaces();
	const isDark = findVariant(theme)?.base === "dark";
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
		// Navigator-rendered text (headers, back labels) uses the theme's body
		// face. The nominal weight comes first so a face carrying its own weight wins.
		fonts: {
			bold: { fontFamily: faces.semibold, fontWeight: "600" },
			heavy: { fontFamily: faces.bold, fontWeight: "700" },
			medium: { fontFamily: faces.medium, fontWeight: "500" },
			regular: { fontFamily: faces.normal, fontWeight: "400" },
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
		setNativeAppearance(followsOS ? "system" : isDark ? "dark" : "light");
	}, [followsOS, isDark]);

	return <ThemeProvider value={navTheme}>{children}</ThemeProvider>;
}
