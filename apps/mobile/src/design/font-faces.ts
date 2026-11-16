/**
 * The faces each theme sets for Uniwind's weight roles (`font-normal`,
 * `font-medium`, `font-semibold`, `font-bold`). Every weight is its own family,
 * so never add a numeric `fontWeight` next to these.
 *
 * Production's current faces, unchanged by the theme generator. The redesign's
 * font pairs (Bricolage Grotesque, DM Sans, Figtree …) replace this file in the
 * fonts PR (F3).
 */

export const FONT_ROLES = ["normal", "medium", "semibold", "bold"] as const;
export type FontRole = (typeof FONT_ROLES)[number];

export const FACE_SETS = {
	/** Every theme's text face. */
	grotesk: {
		bold: "SpaceGrotesk-Bold",
		medium: "SpaceGrotesk-Medium",
		normal: "SpaceGrotesk-Regular",
		semibold: "SpaceGrotesk-SemiBold",
	},
	/** Playful's heavy rounded face, one step heavier per role. */
	nunito: {
		bold: "Nunito_900Black",
		medium: "Nunito_700Bold",
		normal: "Nunito_500Medium",
		semibold: "Nunito_800ExtraBold",
	},
	/** Night's softer face. */
	snPro: {
		bold: "SNPro-Bold",
		medium: "SNPro-Medium",
		normal: "SNPro-Regular",
		semibold: "SNPro-SemiBold",
	},
} as const satisfies Record<string, Record<FontRole, string>>;

export type FaceSetId = keyof typeof FACE_SETS;
