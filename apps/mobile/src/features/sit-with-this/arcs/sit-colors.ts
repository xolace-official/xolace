import { useCSSVariable } from "uniwind";
import { clearOf } from "@/design/clear-of";
import { useScheme } from "@/design/scheme";
import { LIGHT } from "../sit-look";

const SURFACE = {
	dark: { bottom: "sit-late-bottom", wash: "sit-late-wash" },
	light: { bottom: "sit-bottom", wash: "sit-wash" },
} as const;

const LIGHTS = {
	day: {
		core: "sit-core",
		floor: ["sit-floor", "sit-floor-mid"],
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
	wash: [string, string];
	floor: [string, string, string];
	rim: [string, string, string];
	seam: string[];
	seamStops: readonly number[];
	core: [string, string, string, string];
	edge: string[];
	edgeRange: readonly [number, number];
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
