import {
	FIXED_FACES,
	type FixedFace,
	FONT_PAIRS,
	type FontRole,
} from "./font-pairs";

export const FONTS = {
	display: FONT_PAIRS.warm.display,
	displayBold: FONT_PAIRS.warm["display-bold"],
	displaySemi: FONT_PAIRS.warm["display-semi"],
	letter: FIXED_FACES.letter,
	mirror: FIXED_FACES.mirror,
	poster: FIXED_FACES.poster,
	posterMedium: FIXED_FACES["poster-medium"],
	posterSemi: FIXED_FACES["poster-semi"],
	reader: FIXED_FACES.reader,
	readerItalic: FIXED_FACES["reader-italic"],
	readerSemi: FIXED_FACES["reader-semi"],
} as const;

const em = (size: number, ratio: number) =>
	Math.round(size * ratio * 100) / 100;

export type TypeStyle = {
	font: FontRole | FixedFace;
	fontSize: number;
	lineHeight: number;
	letterSpacing?: number;
};

export const TYPE = {
	body: { font: "normal", fontSize: 17, lineHeight: 24 },
	callout: { font: "normal", fontSize: 15, lineHeight: 20 },
	caption: { font: "normal", fontSize: 12, lineHeight: 16 },
	compose: { font: "normal", fontSize: 21, lineHeight: 30 },
	detail: { font: "normal", fontSize: 13.5, lineHeight: 18 },
	display: {
		font: "display",
		fontSize: 40,
		letterSpacing: em(40, -0.035),
		lineHeight: 42,
	},
	footnote: { font: "normal", fontSize: 13, lineHeight: 18 },
	greeting: {
		font: "display",
		fontSize: 34,
		letterSpacing: em(34, -0.03),
		lineHeight: 36,
	},
	headline: {
		font: "display-bold",
		fontSize: 20,
		letterSpacing: em(20, -0.01),
		lineHeight: 24,
	},
	headlineL: {
		font: "display-bold",
		fontSize: 22,
		letterSpacing: em(22, -0.015),
		lineHeight: 26,
	},
	hero: {
		font: "display",
		fontSize: 48,
		letterSpacing: em(48, -0.035),
		lineHeight: 50,
	},
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

export function scalesAsBody(variant: TypeVariant): boolean {
	return BODY_ROLES.includes(TYPE[variant].font);
}

export const DISPLAY_MAX_SCALE = 1.25;
export const BODY_MAX_SCALE = 1.8;
