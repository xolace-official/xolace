import type { BreathPhase } from "@/src/lib/haptics";

// Fixed gap between the two shapes in pixels
export const GAP = 14;

// Shape geometry — ratios of canvas dimensions
export const SHAPE = {
	bot: {
		peak: { baseR: 56, hRatio: 0.54, wRatio: 0.86 },
		rest: { baseR: 40, hRatio: 0.2, wRatio: 0.74 },
	},
	top: {
		peak: { baseR: 40, hRatio: 0.32, wRatio: 0.74 },
		rest: { baseR: 54, hRatio: 0.6, wRatio: 0.82 },
	},
} as const;

// Per-corner radius multipliers.
// Outer corners (away from the gap) are large and organic.
// Inner corners (facing the gap) are dramatically tighter — like two stones pressing together.
// Left/right values differ slightly on each corner for the imperfect stone quality.
export const TOP_CORNERS = {
	bottomLeft: { x: 0.26, y: 0.32 }, // inner — very tight, slightly different
	bottomRight: { x: 0.3, y: 0.26 }, // inner — very tight
	topLeft: { x: 1.02, y: 1.08 }, // outer — large
	topRight: { x: 1.1, y: 0.98 }, // outer — large, slightly wide
} as const;

export const BOT_CORNERS = {
	bottomLeft: { x: 0.98, y: 1.1 }, // outer — large, slightly tall
	bottomRight: { x: 1.08, y: 1.02 }, // outer — large
	topLeft: { x: 0.28, y: 0.3 }, // inner — very tight
	topRight: { x: 0.32, y: 0.26 }, // inner — very tight, slightly different
} as const;

// Corner wobble during hold phase
export const WOBBLE_AMPLITUDE = 6;
export const WOBBLE_DURATION_MS = 880;

export const PHASE_LABELS: Record<BreathPhase, string> = {
	exhale: "Breathe out",
	inhale: "Breathe in",
	top: "Hold",
};
