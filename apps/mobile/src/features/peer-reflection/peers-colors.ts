import { useCSSVariable } from "uniwind";

/** Day, or the night window's late light. */
type Tone = "day" | "late";

/**
 * The fixed light this screen draws with (`--color-peers-*` in global.css, the
 * board's `COL`, `YOUC`, `.pl`, `.chip`, `.cd .lit`, `.cw .edge` and `.nx i`),
 * by tone, each a token name. The day stars and the edge are the Flux spectrum.
 */
const NAMES = {
	day: {
		chip: ["peers-chip", "peers-chip-edge", "peers-chip-shadow"],
		dotGlow: "peers-dot-glow",
		edge: ["peach", "rose", "lilac", "sky"],
		ember: ["peers-you-core", "peach", "rose"],
		floor: ["peers-floor", "peers-floor-mid"],
		glyph: ["peers-glyph-ring", "peers-glyph-glow"],
		lineFrom: "peach",
		point: ["peers-point", "peers-point-near", "peers-point-far"],
		stars: ["lilac", "rose", "peach", "sky"],
	},
	late: {
		chip: ["peers-late-chip", "peers-late-chip-edge", "peers-late-chip-shadow"],
		dotGlow: "peers-late-dot-glow",
		edge: ["night-ember", "peers-late-star-2"],
		ember: ["peers-late-you-core", "night-ember", "peers-late-star-2"],
		floor: ["peers-late-floor", "peers-late-floor-mid"],
		glyph: ["peers-late-glyph-ring", "peers-late-glyph-glow"],
		lineFrom: "night-ember",
		point: [
			"peers-late-point",
			"peers-late-point-near",
			"peers-late-point-far",
		],
		stars: [
			"night-ember",
			"peers-late-star-2",
			"peers-late-star-3",
			"peers-late-star-4",
		],
	},
} as const;

/** Shared by both tones. */
const COMMON = {
	/** The ring None yet sends out (the Flux spectrum's peach). */
	alone: "peach",
	cardShadow: "peers-card-shadow",
} as const;

type Shape<T> = {
	-readonly [K in keyof T]: T[K] extends string ? string : string[];
};
export type PeersColors = Shape<(typeof NAMES)["day"]> & Shape<typeof COMMON>;

const FALLBACK = "transparent";

/**
 * Every colour of one tone, read once from the theme's CSS variables. The board
 * has no dark theme by day: there the lit chip takes the dusk wash, since the
 * day's near-white chip would put its light label on white.
 */
export function usePeersColors(late: boolean, dark: boolean): PeersColors {
	const table = {
		...NAMES[late ? "late" : "day"],
		...(dark ? { chip: NAMES.late.chip } : {}),
		...COMMON,
	};
	const keys = Object.keys(table) as (keyof PeersColors)[];
	const names = keys.flatMap((k) => {
		const v: string | readonly string[] = table[k];
		return typeof v === "string" ? [v] : [...v];
	});
	const values = useCSSVariable(names.map((n) => `--color-${n}`));
	const out = {} as Record<string, string | string[]>;
	let i = 0;
	for (const k of keys) {
		const v: string | readonly string[] = table[k];
		const take = () => String(values[i++] ?? FALLBACK);
		out[k] = typeof v === "string" ? take() : v.map(take);
	}
	return out as PeersColors;
}

/** `#rrggbb` + α → `rgba(…)` (Skia gradients fading a token to clear). */
export function withAlpha(color: string, alpha: number): string {
	const hex = color.match(/^#([0-9a-f]{6})$/i);
	if (!hex) {
		return color;
	}
	const v = Number.parseInt(hex[1], 16);
	return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}
