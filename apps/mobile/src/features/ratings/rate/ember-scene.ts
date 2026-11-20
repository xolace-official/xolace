import { useCSSVariable } from "uniwind";
import type { CubicBezier } from "@/design/ease";

const NAMES = [
	"rate-page",
	"rate-ink",
	"rate-cream",
	"rate-body",
	"rate-label",
	"rate-close-fill",
	"rate-close-edge",
	"rate-pill",
	"rate-pill-ink",
	"rate-glow-core",
	"rate-glow-mid",
	"rate-leaf",
	"rate-stem",
	"rate-star-1",
	"rate-star-2",
	"rate-star-3",
	"rate-note-paper",
	"rate-note-ink",
	"rate-note-mark",
	"rate-note-by",
	"rate-note-shadow",
] as const;
export type EmberColor = (typeof NAMES)[number];
export type Ember = Record<EmberColor, string>;

export function useEmber(): Ember {
	const values = useCSSVariable(NAMES.map((n) => `--color-${n}`));
	return Object.fromEntries(
		NAMES.map((n, i) => [n, String(values[i] ?? "transparent")])
	) as Ember;
}

export const STARS: readonly {
	size: number;
	y: number;
	tilt: number;
	color: EmberColor;
}[] = [
	{ color: "rate-star-1", size: 21, tilt: -16, y: 4 },
	{ color: "rate-star-2", size: 26, tilt: -8, y: -7 },
	{ color: "rate-star-3", size: 34, tilt: 0, y: -13 },
	{ color: "rate-star-2", size: 26, tilt: 8, y: -7 },
	{ color: "rate-star-1", size: 21, tilt: 16, y: 4 },
];

export const STAR_PATH =
	"M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z";

export const SCENE_MOTION = {
	driftMs: 70_000,
	fadeMs: 250,
	leaf: { delay: 100, from: 0.85, ms: 600 },
	rise: {
		curve: [0.2, 0.8, 0.2, 1] as CubicBezier,
		delays: [900, 1000, 1150, 1300],
		dy: 14,
		ms: 500,
	},
	star: {
		delay: 350,
		fadeMs: 300,
		fromScale: 0.4,
		fromTilt: -40,
		stagger: 120,
	},
} as const;

export const NOTE = {
	dropEven: 6,
	gap: 12,
	h: 184,
	tiltEven: 1.3,
	tiltOdd: -1.6,
	w: 224,
} as const;
