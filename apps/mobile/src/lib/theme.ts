/**
 * Fallback colors and layout constants used by components that need JS color values
 * (e.g. the native tab bar). Most theming is handled via CSS variables in global.css.
 *
 * For theme-aware colors in HeroUI Native components, use `useThemeColor` from heroui-native.
 * For Uniwind/Tailwind styling, use className with CSS variable classes (e.g. `bg-background`).
 */

import { Platform } from "react-native";

export const Colors = {
	dark: {
		background: "#000000",
		backgroundElement: "#212225",
		backgroundSelected: "#2E3135",
		text: "#ffffff",
		textSecondary: "#B0B4BA",
	},
	light: {
		background: "#ffffff",
		backgroundElement: "#F0F0F3",
		backgroundSelected: "#E0E1E6",
		text: "#000000",
		textSecondary: "#60646C",
	},
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
	default: {
		mono: "monospace",
		rounded: "normal",
		sans: "normal",
		serif: "serif",
	},
	ios: {
		/** iOS `UIFontDescriptorSystemDesignMonospaced` */
		mono: "ui-monospace",
		/** iOS `UIFontDescriptorSystemDesignRounded` */
		rounded: "ui-rounded",
		/** iOS `UIFontDescriptorSystemDesignDefault` */
		sans: "system-ui",
		/** iOS `UIFontDescriptorSystemDesignSerif` */
		serif: "ui-serif",
	},
	web: {
		mono: "var(--font-mono)",
		rounded: "var(--font-rounded)",
		sans: "var(--font-display)",
		serif: "var(--font-serif)",
	},
});

export const Spacing = {
	five: 32,
	four: 24,
	half: 2,
	one: 4,
	six: 64,
	three: 16,
	two: 8,
} as const;

export const BottomTabInset = Platform.select({ android: 80, ios: 50 }) ?? 0;
export const MaxContentWidth = 800;
