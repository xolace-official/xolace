export const POSTER_WASH = {
	colors: ["#F9F06B", "#F7B7C8", "#B9B7B4"] as const,
	end: { x: 0.59, y: 1 },
	locations: [0, 0.62, 1] as const,
	start: { x: 0.41, y: 0 },
};

export const SCRIM = {
	colors: [
		"rgba(0,0,0,0.36)",
		"rgba(0,0,0,0.06)",
		"rgba(0,0,0,0.24)",
		"rgba(0,0,0,0.10)",
		"rgba(0,0,0,0.52)",
	] as const,
	locations: [0, 0.2, 0.46, 0.7, 1] as const,
};
export const SCRIM_CLEAR = 0.45;

export const PAPER_SCRIM = {
	colors: [
		"rgba(255,253,248,0.24)",
		"rgba(255,253,248,0.04)",
		"rgba(255,253,248,0.16)",
		"rgba(255,253,248,0.07)",
		"rgba(255,253,248,0.34)",
	] as const,
	locations: SCRIM.locations,
};

export const TILE_VEIL = {
	dark: "rgba(255,253,248,0.12)",
	light: "rgba(0,0,0,0.18)",
} as const;

type Scrimmed = { ink: "light" | "dark"; drawn?: "poster" | "night" };

const bare = (b: Scrimmed) => b.ink === "dark" && b.drawn === "poster";

export const scrimOf = (b: Scrimmed) => {
	if (bare(b)) {
		return null;
	}
	return b.ink === "light" ? SCRIM : PAPER_SCRIM;
};

export const tileVeilOf = (b: Scrimmed) => (bare(b) ? null : TILE_VEIL[b.ink]);
