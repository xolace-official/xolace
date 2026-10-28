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

// Single source of truth for the native route background. The navigator paints
// every screen container (and opaque / formSheet headers) with the nav theme's
// colors, so feeding it the active app palette themes all nested stacks at once
// and paints the container before JS content mounts — no stock grey/white edge.
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

	// Native chrome (liquid glass sheets/headers/tabs, alerts, keyboards) reads
	// the OS appearance, not our theme — a dark theme on a light-mode phone got
	// light glass under light text. Force it to match an explicit choice. In
	// "system" mode leave it unspecified: forcing would freeze the OS listener
	// that the system theme follows. A colour theme in system mode is already
	// frozen (theme-bootstrap resolves `<id>-<mode>` once at launch), so force
	// it there too or an OS flip leaves native chrome on the wrong side.
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
