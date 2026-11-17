/**
 * Ink on a cover photo, which the `--color-cover-*` tokens can't express as stops or alpha steps
 * (the fixed-palette note in global.css): white on the photo, black under it.
 */
export const COVER_SCRIM = {
	colors: ["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"] as const,
	locations: [0.35, 1] as const,
};

/** A hub cover's top wash, so the status bar reads on any photo: black 28% to clear. */
export const HUB_WASH = {
	colors: ["rgba(0,0,0,0.28)", "rgba(0,0,0,0)"] as const,
	locations: [0, 0.34] as const,
};
