// Which colours a face draws with, for every renderer (`XolaceFace` in its own canvas,
// `FaceDrawing` inside another). Pure: the renderers read the theme tokens and pass them in.

import type { BodyName } from "./bodies";
import type { FeatureColors } from "./face-geo";
import { type GradientSet, PALETTES, type PaletteName } from "./face-palette";

/** The theme colours a face can use (`--color-*` tokens, read by `useFaceColors`). */
export type FaceTokens = Omit<FeatureColors, "mouth"> & {
	fg: string;
	bg: string;
	accent: string;
	accentFg: string;
	muted: string;
	/** The highlight's transparent end. */
	highlightClear: string;
};

export type FaceColors = {
	/** The body's gradient, or null when it's one colour. */
	gradient: GradientSet | null;
	/** The body's colour when there's no gradient. */
	solid: string;
	/** Whether the soft highlight sits on the body (not on flat chalk). */
	shine: boolean;
	highlightClear: string;
	/** The features' colours. */
	colors: FeatureColors;
};

/**
 * Chalk (the square) is flat, in the theme's text colour, and ignores the palette. Otherwise the
 * palette picks: a gradient set, "theme" (the accent) or "muted" (a face at rest, set aside). The
 * palette defaults to the brand gradient, and to the theme accent on an orb.
 */
export function faceColors({
	body,
	palette,
	tokens,
}: {
	body: BodyName;
	palette?: PaletteName;
	tokens: FaceTokens;
}): FaceColors {
	const { fg, bg, accent, accentFg, muted, highlightClear } = tokens;
	const fixed = {
		blush: tokens.blush,
		brow: tokens.brow,
		highlight: tokens.highlight,
		pupil: tokens.pupil,
		sclera: tokens.sclera,
	};
	const base = { highlightClear, shine: true };
	if (body === "square") {
		return {
			colors: { ...fixed, brow: bg, mouth: bg, pupil: fg, sclera: bg },
			gradient: null,
			highlightClear,
			shine: false,
			solid: fg,
		};
	}
	const set = palette ?? (body === "orb" ? "theme" : "brand");
	if (set === "muted") {
		return {
			...base,
			colors: { ...fixed, brow: bg, mouth: bg },
			gradient: null,
			solid: muted,
		};
	}
	if (set === "theme") {
		return {
			...base,
			colors: { ...fixed, brow: accentFg, mouth: accentFg },
			gradient: null,
			solid: accent,
		};
	}
	const gradient = PALETTES[set];
	return {
		...base,
		colors: { ...fixed, mouth: gradient.mouth },
		gradient,
		solid: accent,
	};
}
