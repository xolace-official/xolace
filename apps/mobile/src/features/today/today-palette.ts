/**
 * The parts of Today's light a theme token can't give yet: kindling's fire and the
 * campfire's warmth, fixed on purpose because they are fire, the same in every theme.
 */

/** The kindling path's fire (kindling/): lit stretches, their glow, the running highlight, sparks and the wisp. */
export const KINDLING_LIGHT = {
	/** A tended node's check. */
	check: "#FFFFFF",
	/** Under the lit stroke (the theme's `ember`): a soft amber copy. */
	glow: "#FFB36B",
	/** The highlight that runs a lit stretch every 6.4 s. */
	pulse: "#FFF4DA",
	spark: "#FFC27A",
	/** The warm wash behind the tended part of the path. */
	wash: "radial-gradient(closest-side, rgba(242,163,58,0.17), rgba(242,163,58,0))",
	wisp: {
		core: "#FFF1D6",
		far: "rgba(242,163,58,0.35)",
		glow: "rgba(255,190,110,0.75)",
	},
} as const;

/** The campfire's warmth (campfire/): the glow off its lower edge and the rising embers. */
export const CAMPFIRE_LIGHT = {
	ember: "#FFC46B",
	emberGlow: "0 0 6px 2px rgba(255,170,80,0.6)",
	glow: "radial-gradient(closest-side, rgba(255,168,90,0.34), rgba(255,168,90,0))",
} as const;
