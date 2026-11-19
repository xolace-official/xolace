/**
 * Font pairs and fixed faces.
 *
 * Plain data, no font files: the theme generator (scripts/themes/build.ts)
 * reads it to write each theme's font variables, and src/design/font-sources.ts
 * maps the same names to the files src/design/fonts.ts loads.
 *
 * Every value is a `useFonts` key ("Figtree_400Regular"), never a PostScript
 * name: Android only knows the key. Each weight and style is its own family,
 * so nothing here is ever paired with a numeric fontWeight or fontStyle.
 */

/** Heading + body faces a theme picks (the `fonts` field in src/design/themes.ts). */
export type FontPairId = "warm" | "clear" | "playful";

/** The roles a theme sets. Each is a CSS variable `--font-<role>` and a class `font-<role>`. */
export const FONT_ROLES = [
	"display",
	"display-bold",
	"display-semi",
	// HeroUI reads these four.
	"normal",
	"medium",
	"semibold",
	"bold",
	"italic",
	"italic-medium",
] as const;
export type FontRole = (typeof FONT_ROLES)[number];

export const FONT_PAIRS: Record<FontPairId, Record<FontRole, string>> = {
	// Space Grotesk stops at 700, so display and display-bold are the same face.
	clear: {
		bold: "DMSans_700Bold",
		display: "SpaceGrotesk_700Bold",
		"display-bold": "SpaceGrotesk_700Bold",
		"display-semi": "SpaceGrotesk_600SemiBold",
		italic: "DMSans_400Regular_Italic",
		"italic-medium": "DMSans_500Medium_Italic",
		medium: "DMSans_500Medium",
		normal: "DMSans_400Regular",
		semibold: "DMSans_600SemiBold",
	},
	playful: {
		bold: "Nunito_700Bold",
		display: "Nunito_900Black",
		"display-bold": "Nunito_800ExtraBold",
		"display-semi": "Nunito_700Bold",
		italic: "Nunito_400Regular_Italic",
		"italic-medium": "Nunito_500Medium_Italic",
		medium: "Nunito_500Medium",
		normal: "Nunito_400Regular",
		semibold: "Nunito_600SemiBold",
	},
	warm: {
		bold: "Figtree_700Bold",
		display: "BricolageGrotesque_800ExtraBold",
		"display-bold": "BricolageGrotesque_700Bold",
		"display-semi": "BricolageGrotesque_600SemiBold",
		italic: "Figtree_400Regular_Italic",
		"italic-medium": "Figtree_500Medium_Italic",
		medium: "Figtree_500Medium",
		normal: "Figtree_400Regular",
		semibold: "Figtree_600SemiBold",
	},
};

export const FONT_PAIR_IDS = Object.keys(FONT_PAIRS) as FontPairId[];

/** Default's pair, and the one night mode uses: always loaded at launch. */
export const DEFAULT_FONT_PAIR: FontPairId = "warm";

/**
 * Faces that don't follow the theme. CSS variable `--font-<key>`, set once in
 * `@theme static`. The reader's Atkinson and Literata bold load in the reader
 * itself (src/features/lantern/reader/reading-modes.ts).
 */
export const FIXED_FACES = {
	/** The reader, "Clear". */
	atkinson: "AtkinsonHyperlegibleNext_400Regular",
	"atkinson-bold": "AtkinsonHyperlegibleNext_700Bold",
	/** Letters: the letter itself, upright. */
	letter: "Newsreader_400Regular",
	/** The mirror's voice, Sit, peer quotes, prompts. */
	mirror: "Newsreader_400Regular_Italic",
	/** The quote poster. */
	poster: "SpaceGrotesk_700Bold",
	"poster-medium": "SpaceGrotesk_500Medium",
	"poster-semi": "SpaceGrotesk_600SemiBold",
	/** The reader, "By the fire". */
	reader: "Literata_400Regular",
	"reader-bold": "Literata_700Bold",
	"reader-italic": "Literata_400Regular_Italic",
	"reader-semi": "Literata_600SemiBold",
} as const;
export type FixedFace = keyof typeof FIXED_FACES;

/** A pair's faces, each once (Space Grotesk's display and display-bold are one). */
export const pairFaces = (id: FontPairId): string[] => [
	...new Set(Object.values(FONT_PAIRS[id])),
];

/**
 * Every face the launch gate waits for, with `pair` the active theme's:
 * Default's pair (night uses it too, so switching to night
 * never waits) and the active pair. Fixed faces load where they're drawn
 * (`useFixedFaces` in src/design/fonts.ts).
 */
export function launchFaces(pair: FontPairId): string[] {
	return [...new Set([...pairFaces(DEFAULT_FONT_PAIR), ...pairFaces(pair)])];
}
