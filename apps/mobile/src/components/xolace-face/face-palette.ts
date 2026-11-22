export type GradientSet = {
	mouth: string;
	positions: number[];
	stops: string[];
};

export const PALETTES = {
	brand: {
		mouth: "#d9734a",
		positions: [0, 0.3, 0.6, 0.8, 1],
		stops: ["#f79a72", "#f6c25f", "#ee8fc4", "#b09cf0", "#5fd5e4"],
	},
	dusk: {
		mouth: "#8a3a6e",
		positions: [0, 0.5, 1],
		stops: ["#ff9a8b", "#c56cf0", "#6a6af0"],
	},
	ember: {
		mouth: "#a8402c",
		positions: [0, 0.5, 1],
		stops: ["#ffd36b", "#ff8a5c", "#e8506a"],
	},
	moss: {
		mouth: "#2f6b4f",
		positions: [0, 0.5, 1],
		stops: ["#d9e88a", "#8fd18b", "#3ea58a"],
	},
	sea: {
		mouth: "#25507a",
		positions: [0, 0.5, 1],
		stops: ["#a6f0d4", "#43c6e8", "#4f7cf0"],
	},
} satisfies Record<string, GradientSet>;

export type PaletteName = keyof typeof PALETTES | "theme" | "muted";
