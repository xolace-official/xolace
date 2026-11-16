import {
	FIXED_FACES,
	type FixedFace,
	FONT_PAIRS,
	type FontRole,
} from "./font-pairs";

/**
 * Type. Each theme picks a font pair (src/design/font-pairs.ts): a heading
 * face for the voice and a body face, with italics, for everything you read.
 * A few faces never follow the theme: the mirror's Newsreader, the reader's
 * Literata and Atkinson, the quote poster's Space Grotesk.
 *
 * `FONTS.display`, `displayBold` and `displaySemi` are theme roles. Their
 * values are Default's faces, so they still draw Default's heading anywhere.
 * AppText swaps them for the active theme's face; outside AppText use the
 * `font-display*` classes or `useThemeFaces()` (src/design/fonts.ts).
 */
export const FONTS = {
	display: FONT_PAIRS.warm.display,
	displayBold: FONT_PAIRS.warm["display-bold"],
	displaySemi: FONT_PAIRS.warm["display-semi"],
	/** Letters: the letter, upright Newsreader. */
	letter: FIXED_FACES.letter,
	/** The mirror's own voice, set apart from yours. */
	mirror: FIXED_FACES.mirror,
	poster: FIXED_FACES.poster,
	posterMedium: FIXED_FACES["poster-medium"],
	/** The quote's small title and the tiles' "Aa". */
	posterSemi: FIXED_FACES["poster-semi"],
	reader: FIXED_FACES.reader,
	readerItalic: FIXED_FACES["reader-italic"],
	readerSemi: FIXED_FACES["reader-semi"],
} as const;

const em = (size: number, ratio: number) =>
	Math.round(size * ratio * 100) / 100;

export type TypeStyle = {
	/** A theme role, or a fixed face. */
	font: FontRole | FixedFace;
	fontSize: number;
	lineHeight: number;
	/** In px. */
	letterSpacing?: number;
};

/**
 * Sizes follow the redesign's System board; the extra steps are the sizes the
 * screen boards use. Each variant is a `type-<name>` class
 * (src/themes/type.generated.css, written by `bun run themes`), which AppText
 * uses.
 */
export const TYPE = {
	/** Body 17/24 */
	body: { font: "normal", fontSize: 17, lineHeight: 24 },
	callout: { font: "normal", fontSize: 15, lineHeight: 20 },
	caption: { font: "normal", fontSize: 12, lineHeight: 16 },
	/** The composer's own text */
	compose: { font: "normal", fontSize: 21, lineHeight: 30 },
	/** Secondary lines under a row title */
	detail: { font: "normal", fontSize: 13.5, lineHeight: 18 },
	/** Display 40/42 */
	display: {
		font: "display",
		fontSize: 40,
		letterSpacing: em(40, -0.035),
		lineHeight: 42,
	},
	/** Footnote 13/18 */
	footnote: { font: "normal", fontSize: 13, lineHeight: 18 },
	/** Today's greeting: Bricolage 34, line height 1.06, tracking −.03em */
	greeting: {
		font: "display",
		fontSize: 34,
		letterSpacing: em(34, -0.03),
		lineHeight: 36,
	},
	/** Headline 20/24 */
	headline: {
		font: "display-bold",
		fontSize: 20,
		letterSpacing: em(20, -0.01),
		lineHeight: 24,
	},
	/** Path cards, speech bubbles */
	headlineL: {
		font: "display-bold",
		fontSize: 22,
		letterSpacing: em(22, -0.015),
		lineHeight: 26,
	},
	/** Heard. / big moments */
	hero: {
		font: "display",
		fontSize: 48,
		letterSpacing: em(48, -0.035),
		lineHeight: 50,
	},
	/** A kept mirror line, in the theme's italic */
	mirror: {
		font: "italic",
		fontSize: 25,
		letterSpacing: -0.25,
		lineHeight: 34,
	},
	overline: {
		font: "bold",
		fontSize: 12.5,
		letterSpacing: 1.25,
		lineHeight: 16,
	},
	poster: { font: "poster", fontSize: 34, letterSpacing: -0.6, lineHeight: 36 },
	/** The Reflect card prompt */
	prompt: {
		font: "display-bold",
		fontSize: 30,
		letterSpacing: em(30, -0.025),
		lineHeight: 32.5,
	},
	quote: { font: "italic", fontSize: 18, lineHeight: 25 },
	reader: { font: "reader", fontSize: 19, lineHeight: 31 },
	subhead: { font: "normal", fontSize: 16, lineHeight: 21 },
	tab: { font: "semibold", fontSize: 10.5, lineHeight: 13 },
	/** Title 28/32 */
	title: {
		font: "display-bold",
		fontSize: 28,
		letterSpacing: em(28, -0.025),
		lineHeight: 32,
	},
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof TYPE;

export type Weight = "regular" | "medium" | "semibold" | "bold";

const BODY_ROLES: readonly string[] = [
	"normal",
	"medium",
	"semibold",
	"bold",
	"italic",
	"italic-medium",
];

/** Body text grows fully with Dynamic Type; headings and fixed faces less. */
export function scalesAsBody(variant: TypeVariant): boolean {
	return BODY_ROLES.includes(TYPE[variant].font);
}

/** Display text grows with Dynamic Type, but less than body text. */
export const DISPLAY_MAX_SCALE = 1.25;
export const BODY_MAX_SCALE = 1.8;
