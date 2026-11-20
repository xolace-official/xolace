import { useCSSVariable } from "uniwind";

type Tone = "day" | "late";

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

const COMMON = {
	alone: "peach",
	cardShadow: "peers-card-shadow",
} as const;

type Shape<T> = {
	-readonly [K in keyof T]: T[K] extends string ? string : string[];
};
export type PeersColors = Shape<(typeof NAMES)["day"]> & Shape<typeof COMMON>;

const FALLBACK = "transparent";

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

export function withAlpha(color: string, alpha: number): string {
	const hex = color.match(/^#([0-9a-f]{6})$/i);
	if (!hex) {
		return color;
	}
	const v = Number.parseInt(hex[1], 16);
	return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}
