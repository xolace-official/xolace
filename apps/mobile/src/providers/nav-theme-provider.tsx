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
		fonts: {
			bold: { fontFamily: faces.semibold, fontWeight: "600" },
			heavy: { fontFamily: faces.bold, fontWeight: "700" },
			medium: { fontFamily: faces.medium, fontWeight: "500" },
			regular: { fontFamily: faces.normal, fontWeight: "400" },
		},
	};

	useEffect(() => {
		SystemUI.setBackgroundColorAsync(background);
	}, [background]);

	const mode = useAppStore((s) => s.theme);
	const colorThemeId = useAppStore((s) => s.colorThemeId);
	const followsOS = mode === "system" && colorThemeId === "default";
	useEffect(() => {
		setNativeAppearance(followsOS ? "system" : isDark ? "dark" : "light");
	}, [followsOS, isDark]);

	return <ThemeProvider value={navTheme}>{children}</ThemeProvider>;
}
