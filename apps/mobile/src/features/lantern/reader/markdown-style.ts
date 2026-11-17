import type { MarkdownStyle } from "react-native-enriched-markdown";
import { useThemeFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import {
	READING_MODES,
	type ReadingModeKey,
} from "@/features/lantern/reader/reading-modes";
import { useTokenColors } from "@/lib/use-token-color";

const GAP = 0.9;
const CALLOUT = { gap: 12, pad: 12, r: 12 } as const;
const SCALE = { h1: 1.45, h2: 1.22, h3: 1.06 } as const;
const LINE = { h1: 1.8, h2: 1.55, h3: 1.45 } as const;

/**
 * The body's look for a reading mode (#401, handoff §5.2). Colours are the page's roles, so inside
 * `ReaderPageScope` they follow the page. Classic is the theme's own body face with headings in
 * its heading face; Clear and By the fire fall back to it until their faces load.
 */
export function useMarkdownStyle(
	mode: ReadingModeKey,
	size: number,
	fontsLoaded: boolean
): MarkdownStyle {
	const [ink, muted, accent, line, well] = useTokenColors([
		"foreground",
		"muted",
		"accent",
		"separator",
		"surface-secondary",
	]);
	const faces = useThemeFaces();
	const scheme = useScheme();
	const { face, lineHeight, page } = READING_MODES[mode];
	const own = fontsLoaded && face !== null;
	const regular = own ? face.regular : faces.normal;
	const bold = own ? face.bold : faces.bold;
	const italic = own ? face.italic : faces.italic;
	const heading = own ? face.bold : faces["display-bold"];
	// Accent links clear AA on dark pages and miss it on light ones (#415); there the underlined
	// ink carries the link.
	const darkPage = page === "night" || (page === "app" && scheme === "dark");
	const lh = (n: number) => Math.round(n * lineHeight);
	const px = (k: number) => Math.round(size * k);
	const head = (k: keyof typeof SCALE) => ({
		color: ink,
		fontFamily: heading,
		fontSize: px(SCALE[k]),
		lineHeight: px(LINE[k]),
		marginBottom: 8,
		marginTop: 20,
	});
	return {
		// A callout: a well box, its kind in bold on its own line, one size smaller.
		blockquote: {
			backgroundColor: well,
			borderColor: well,
			borderRadius: CALLOUT.r,
			borderWidth: 0,
			color: ink,
			fontFamily: regular,
			fontSize: size - 1,
			gapWidth: CALLOUT.gap,
			lineHeight: lh(size - 1),
			marginBottom: px(GAP),
			padding: CALLOUT.pad,
		},
		code: { backgroundColor: well, borderColor: line, color: ink },
		em: { color: ink, fontFamily: italic, fontStyle: "normal" },
		h1: head("h1"),
		h2: head("h2"),
		h3: head("h3"),
		link: { color: darkPage ? accent : ink, underline: true },
		list: {
			bulletColor: muted,
			color: ink,
			fontFamily: regular,
			fontSize: size,
			itemSpacing: 6,
			lineHeight: lh(size),
			marginBottom: px(GAP),
			markerColor: muted,
		},
		paragraph: {
			color: ink,
			fontFamily: regular,
			fontSize: size,
			lineHeight: lh(size),
			marginBottom: px(GAP),
		},
		strong: { color: ink, fontFamily: bold, fontWeight: "normal" },
		thematicBreak: { color: line, marginBottom: 24, marginTop: 8 },
	};
}
