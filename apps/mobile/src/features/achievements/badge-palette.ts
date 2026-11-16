// The parts of the badges' palette a `--badge-*` / `--arrival-*` token cannot
// express: colours drawn inside Skia pictures and SVG gradients, read on the UI
// thread. Fixed on purpose: badges and their arrival are printed objects
// (fixed-palette convention, apps/mobile/AGENTS.md). The handoffs' numbers.

/** The confetti: the Flux spectrum and the ember, in the board's order (arrivals §2). */
export const CONFETTI = [
	"#FFB38A",
	"#B49BFF",
	"#7DD3E8",
	"#FF8DB4",
	"#F2A33A",
] as const;

/** The ring of sparks leaving the count (arrivals §3): gold, every third one orange. */
export const RING_SPARK = { gold: "#FFD06A", orange: "#FF8A2A" } as const;

/** The embers rising from the fire: a core, a soft halo and its blur, per scheme. */
export const EMBER = {
	day: { blur: 2.5, core: "#F2A33A", halo: "rgba(242,140,40,0.6)" },
	dusk: { blur: 3, core: "#FFCB78", halo: "rgba(255,160,60,0.75)" },
} as const;

/** The fire's glow (arrivals §3): a colour and opacity at the centre, then at 55%, then clear. */
export const FIRE_GLOW = {
	day: {
		inner: "rgb(242,163,58)",
		innerOpacity: 0.42,
		outer: "rgb(242,163,58)",
		outerOpacity: 0.12,
	},
	dusk: {
		inner: "rgb(245,150,60)",
		innerOpacity: 0.46,
		outer: "rgb(245,120,40)",
		outerOpacity: 0.15,
	},
} as const;
