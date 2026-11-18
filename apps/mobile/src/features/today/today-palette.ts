/**
 * The parts of Today's light a theme token can't give: values Skia takes as strings,
 * fixed on purpose because they are fire and daylight, the same in every theme.
 */

/** The Reflect card's light, drawn in Skia (hero/card-light.tsx). Tuned down in review: don't raise these. */
export const CARD_LIGHT = {
	/** The late edge light runs ember into coral; by day it's the Flux spectrum (theme tokens). */
	edgeLate: ["#F5B04F", "#EC7A66"],
	/**
	 * The inner light as stacked inner shadows (ember-charge's recipe): each is the card's
	 * outline pushed up by `dy` × its height so only its lower rim shows, softened by `blur` ×
	 * height. Colours are the board's radial.
	 */
	inner: [
		{ blur: 0.22, color: "rgba(255,141,180,0.16)", dy: 0.3 },
		{ blur: 0.12, color: "rgba(255,179,138,0.24)", dy: 0.15 },
	],
	innerLate: [
		{ blur: 0.22, color: "rgba(236,122,102,0.08)", dy: 0.3 },
		{ blur: 0.12, color: "rgba(245,176,79,0.13)", dy: 0.15 },
	],
	/** The card's own shadow: 0 10px 28px -16px rgba(60,30,120,.22). */
	shadow: "rgba(60,30,120,0.22)",
} as const;
