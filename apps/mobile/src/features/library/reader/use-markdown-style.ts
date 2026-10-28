import { useThemeColor } from "heroui-native";
import type { MarkdownStyle } from "react-native-enriched-markdown";
import { useCSSVariable } from "uniwind";

import { useAppTheme } from "@/context/app-theme-context";
import { READING_MODES, type ReadingModeKey } from "./reading-mode";

/** The entry body's look for a reading mode (#401). Colours come from tokens, so inside
 * `ReaderPageScope` they follow the page. */
export function useMarkdownStyle(
	mode: ReadingModeKey,
	size: number,
	fontsLoaded: boolean
): MarkdownStyle {
	const [foreground, muted, accent, border, surface] = useThemeColor([
		"foreground",
		"muted",
		"accent",
		"border",
		"surface-secondary",
	]);
	const [themeRegular, themeBold] = (
		useCSSVariable(["--font-normal", "--font-bold"]) as string[]
	).map(String);
	const { face, lineHeight, page } = READING_MODES[mode];
	const { isLight } = useAppTheme();
	// Accent links clear AA on every dark page and miss it on every light one
	// (#415, measured per theme); there the underlined ink carries the link.
	const darkPage = page === "night" || (page === "app" && !isLight);
	// Clear and By the fire load at runtime; until then, the theme's face.
	const ready = fontsLoaded || mode === "classic";
	const regular = ready ? face.regular : themeRegular;
	const bold = ready ? face.bold : themeBold;
	const italic = ready ? face.italic : themeRegular;
	const lh = (n: number) => Math.round(n * lineHeight);
	const px = (k: number) => Math.round(size * k);

	const heading = {
		color: foreground,
		fontFamily: bold,
		marginBottom: 8,
		marginTop: 20,
	};
	return {
		blockquote: {
			backgroundColor: surface,
			borderColor: border,
			borderRadius: 12,
			borderWidth: 3,
			color: foreground,
			fontFamily: regular,
			fontSize: size - 1,
			gapWidth: 12,
			lineHeight: lh(size - 1),
			marginBottom: px(0.9),
			padding: 12,
		},
		code: { backgroundColor: surface, borderColor: border, color: foreground },
		// A face without a real italic (Space Grotesk) keeps the synthesized slant.
		em: {
			color: foreground,
			fontFamily: italic,
			fontStyle: italic === regular ? "italic" : "normal",
		},
		h1: { ...heading, fontSize: px(1.45), lineHeight: px(1.8) },
		h2: { ...heading, fontSize: px(1.22), lineHeight: px(1.55) },
		h3: { ...heading, fontSize: px(1.06), lineHeight: px(1.45) },
		link: { color: darkPage ? accent : foreground, underline: true },
		list: {
			bulletColor: muted,
			color: foreground,
			fontFamily: regular,
			fontSize: size,
			itemSpacing: 6,
			lineHeight: lh(size),
			marginBottom: px(0.9),
			markerColor: muted,
		},
		paragraph: {
			color: foreground,
			fontFamily: regular,
			fontSize: size,
			lineHeight: lh(size),
			marginBottom: px(0.9),
		},
		strong: { color: foreground, fontFamily: bold, fontWeight: "normal" },
		thematicBreak: { color: border, marginBottom: 24, marginTop: 8 },
	};
}
