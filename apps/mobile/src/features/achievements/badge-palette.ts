export const CONFETTI = [
	"#FFB38A",
	"#B49BFF",
	"#7DD3E8",
	"#FF8DB4",
	"#F2A33A",
] as const;

export const RING_SPARK = { gold: "#FFD06A", orange: "#FF8A2A" } as const;

export const EMBER = {
	day: { blur: 2.5, core: "#F2A33A", halo: "rgba(242,140,40,0.6)" },
	dusk: { blur: 3, core: "#FFCB78", halo: "rgba(255,160,60,0.75)" },
} as const;

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
