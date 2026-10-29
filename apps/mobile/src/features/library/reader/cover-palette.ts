/** The scrim the `--color-cover-*` tokens cannot express (fixed-palette note in global.css). */
export const COVER_SCRIM = {
	colors: ["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"] as const,
	locations: [0.35, 1] as const,
};
