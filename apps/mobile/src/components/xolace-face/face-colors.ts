import type { BodyName } from "./bodies";
import type { FeatureColors } from "./face-geo";
import { type GradientSet, PALETTES, type PaletteName } from "./face-palette";

export type FaceTokens = Omit<FeatureColors, "mouth"> & {
	fg: string;
	bg: string;
	accent: string;
	accentFg: string;
	muted: string;
	highlightClear: string;
};

export type FaceColors = {
	gradient: GradientSet | null;
	solid: string;
	shine: boolean;
	highlightClear: string;
	colors: FeatureColors;
};

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
