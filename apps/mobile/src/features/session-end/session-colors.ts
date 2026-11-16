import { useCSSVariable } from "uniwind";

/** Day, or the night window's late light. */
export type Tone = "day" | "late";

/**
 * The fixed light this screen draws with (`--color-after-*` in global.css,
 * the board's `<style>` values), by tone, each a token name. The day stars are
 * the Flux spectrum's.
 */
const NAMES = {
	day: {
		dotGlow: "after-dot-glow",
		edge: ["peach", "rose", "lilac", "sky"],
		floor: ["after-floor", "after-floor-mid"],
		gleam: "after-gleam",
		kindling: ["after-kindling-1", "after-kindling-2", "after-kindling-3"],
		light: ["after-light-neutral", "after-light-cool", "after-light-warm"],
		listen: ["after-listen", "after-listen-ink"],
		point: ["after-point", "after-point-glow", "after-point-halo"],
		rail: ["after-rail-heavier", "after-rail-same", "after-rail-lighter"],
		ready: ["after-ready-ring", "after-ready-glow"],
		shadow: "after-shadow",
		sky: ["after-sky-1", "after-sky-2", "after-sky-3", "after-sky-end"],
		stars: ["lilac", "rose", "peach", "sky"],
		thumb: "after-thumb",
		you: ["after-you-core", "peach", "rose"],
		youHalo: "peach",
		youWarm: "after-you-warm",
	},
	late: {
		dotGlow: "after-late-dot-glow",
		edge: ["night-ember", "after-late-star-2"],
		floor: ["after-late-floor", "after-late-floor-mid"],
		gleam: "after-late-gleam",
		kindling: [
			"after-late-kindling-1",
			"after-late-kindling-2",
			"after-late-kindling-3",
		],
		light: [
			"after-late-light-neutral",
			"after-late-light-cool",
			"after-late-light-warm",
		],
		listen: ["after-late-listen", "sky"],
		point: [
			"after-late-point",
			"after-late-point-glow",
			"after-late-point-halo",
		],
		rail: [
			"after-late-rail-heavier",
			"after-late-rail-same",
			"after-late-rail-lighter",
		],
		ready: ["after-late-ready-ring", "after-late-ready-glow"],
		shadow: "after-late-shadow",
		sky: ["after-late-sky-1", "after-late-sky-2", "after-late-sky-end"],
		stars: [
			"after-late-star-1",
			"after-late-star-2",
			"after-late-star-3",
			"after-late-star-4",
		],
		thumb: "after-late-thumb",
		you: ["after-late-you-core", "night-ember", "after-late-star-2"],
		youHalo: "night-ember",
		youWarm: "night-ember",
	},
} as const;

/** Shared by both tones. */
const COMMON = {
	thumbRing: "after-thumb-ring",
	thumbShadow: "after-thumb-shadow",
	writeGleam: "after-write-gleam",
} as const;

type Shape<T> = {
	-readonly [K in keyof T]: T[K] extends string ? string : string[];
};
export type SessionColors = Shape<(typeof NAMES)["day"]> & Shape<typeof COMMON>;

const FALLBACK = "transparent";

/** Every colour of one tone, read once from the theme's CSS variables. */
export function useSessionColors(tone: Tone): SessionColors {
	const table = { ...NAMES[tone], ...COMMON };
	const keys = Object.keys(table) as (keyof SessionColors)[];
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
	return out as SessionColors;
}
