import { useCSSVariable } from "uniwind";
import { clearOf } from "@/design/clear-of";
import { useScheme } from "@/design/scheme";
import { LIGHT } from "../sit-look";

/**
 * The colours the arcs, their light and the thread draw with: the
 * `--color-sit-*` tokens (global.css) and the Flux spectrum. Two choices make
 * them. The arcs' surfaces (the bottom fill, the top's wash) follow the page:
 * dark on a dark theme or late. The light (floor, rim, seam, edge, thread)
 * turns ember in the night window. The boards only drew day on a light theme
 * and late on a dark one; a dark theme by day keeps the spectrum on the late
 * surfaces. Read once from the theme's CSS variables; the clear ends come from
 * `clearOf` so a gradient fades into the colour, never through grey.
 */
const SURFACE = {
	dark: { bottom: "sit-late-bottom", wash: "sit-late-wash" },
	light: { bottom: "sit-bottom", wash: "sit-wash" },
} as const;

const LIGHTS = {
	day: {
		core: "sit-core",
		floor: ["sit-floor", "sit-floor-mid"],
		/** The spectrum, for the seam, the edge light and the thread. */
		light: ["peach", "rose", "lilac", "sky"],
		rim: ["sit-rim", "sit-rim-mid"],
	},
	late: {
		core: "sit-late-core",
		floor: ["sit-late-floor", "sit-late-floor-mid"],
		light: ["night-ember", "sit-late-ember-2"],
		rim: ["sit-late-rim", "sit-late-rim-mid"],
	},
} as const;

export type SitColors = {
	bottom: string;
	/** The top arc's wash, to clear. */
	wash: [string, string];
	/** The floor light: its two stops, then clear. */
	floor: [string, string, string];
	rim: [string, string, string];
	/** The seam's two coloured layers, tapering clear at both ends, at `seamStops`. */
	seam: string[];
	seamStops: readonly number[];
	/** The seam's core, tapering clear at both ends. */
	core: [string, string, string, string];
	/** The edge light's pill, and its opacity from breathed out to in (softer on a dark page). */
	edge: string[];
	edgeRange: readonly [number, number];
	/** The thread's fill. */
	thread: [string, string, ...string[]];
};

const FALLBACK = "transparent";

export function useSitColors(late: boolean): SitColors {
	const scheme = useScheme();
	const dark = late || scheme === "dark";
	const s = dark ? SURFACE.dark : SURFACE.light;
	const n = late ? LIGHTS.late : LIGHTS.day;
	const names = [s.bottom, s.wash, ...n.floor, ...n.rim, n.core, ...n.light];
	const raw = useCSSVariable(names.map((name) => `--color-${name}`)).map((v) =>
		String(v ?? FALLBACK)
	);
	const [bottom, wash, floor, floorMid, rim, rimMid, core, ...light] = raw;
	const first = light[0] ?? FALLBACK;
	const last = light.at(-1) ?? FALLBACK;
	// By day the seam and thread are peach → rose → lilac (the seam clearing
	// into sky); late, the ember pair.
	const inner = late ? light : light.slice(0, -1);
	const e = LIGHT.edge;
	return {
		bottom,
		core: [clearOf(core), core, core, clearOf(core)],
		edge: light,
		edgeRange: dark ? [e.lateLow, e.lateHigh] : [e.low, e.high],
		floor: [floor, floorMid, clearOf(floorMid)],
		rim: [rim, rimMid, clearOf(rimMid)],
		seam: [clearOf(first), ...inner, clearOf(last)],
		seamStops: late ? LIGHT.seamStopsLate : LIGHT.seamStops,
		thread: [first, ...inner.slice(1)] as SitColors["thread"],
		wash: [wash, clearOf(wash)],
	};
}
