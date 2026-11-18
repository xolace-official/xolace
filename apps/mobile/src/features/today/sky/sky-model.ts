import type { TodayPhase } from "../today-model";

/**
 * The sky's numbers and its fixed palette. The colours are strings on purpose, as
 * Vent's are (`vent-palette.ts`): Skia draws them and `interpolateColors` crosses
 * them in worklets, which a theme token can't feed. The sky is the hour's, not the
 * theme's: only light and dark choose between two sets. From the board's `.sky`, `.g-*`, `.sun`, `.ridges`,
 * `.cloud`, `.star`, `.moon` and `.fly`. Positions are in the board's 390 pt
 * page; x is scaled to the device width, y is not.
 */
export const SKY = { h: 420, w: 390 } as const;

type Day = Exclude<TodayPhase, "late">;
type Gradient = { colors: string[]; positions: number[] };
/** Each palette fades into the page at its last stop (the page colour is added at runtime). */
const GRADIENTS: Record<Day, Gradient> = {
	dawn: {
		colors: ["#FFD3BE", "#FFE4D6", "#FCEDEF"],
		positions: [0, 0.34, 0.62, 0.86],
	},
	day: {
		colors: ["#C6DCF5", "#DCE7F9", "#ECEEFA"],
		positions: [0, 0.36, 0.62, 0.86],
	},
	evening: {
		colors: ["#D7B6EA", "#F2BAD3", "#FFCBB4", "#FDE6DB"],
		positions: [0, 0.3, 0.52, 0.7, 0.88],
	},
};
/**
 * The same three hours on a dark theme: deep, muted versions of each hue
 * (dusky rose, slate blue, plum into ember) that still fade into the page.
 * One set for every theme: the last stop is each theme's own dark page.
 */
const GRADIENTS_DARK: Record<Day, Gradient> = {
	dawn: {
		colors: ["#563439", "#3F2834", "#261C29"],
		positions: [0, 0.34, 0.62, 0.86],
	},
	day: {
		colors: ["#2A3D5C", "#223150", "#1B2338"],
		positions: [0, 0.36, 0.62, 0.86],
	},
	evening: {
		colors: ["#3D2A5C", "#552B52", "#5E3442", "#2E1E2B"],
		positions: [0, 0.3, 0.52, 0.7, 0.88],
	},
};
export const LATE_GRADIENT = {
	colors: ["#110D22", "#1D1634", "#18132A", "#0E0C15"],
	positions: [0, 0.36, 0.62, 0.88],
};
/** The night front: its feathered edge is 45% of the sky tall, travelling from −45% to 100%. */
export const NIGHT_FEATHER = 0.45;

export type Sun = {
	x: number;
	y: number;
	scale: number;
	inner: string;
	outer: string;
	halo: string;
	opacity: number;
};
export const SUN_R = 38;
/** The halo reaches 48 pt beyond the disc. */
export const HALO_R = SUN_R + 48;
const SUN: Record<TodayPhase, Sun> = {
	dawn: {
		halo: "rgba(255,170,130,0.62)",
		inner: "#FFF1E2",
		opacity: 1,
		outer: "#FFB38A",
		scale: 0.95,
		x: 70,
		y: 214,
	},
	day: {
		halo: "rgba(255,232,170,0.75)",
		inner: "#FFFDF4",
		opacity: 1,
		outer: "#FFE39C",
		scale: 0.58,
		x: 150,
		y: 182,
	},
	evening: {
		halo: "rgba(255,140,130,0.5)",
		inner: "#FFE8CF",
		opacity: 1,
		outer: "#FF9E7C",
		scale: 1.12,
		x: 196,
		y: 222,
	},
	late: {
		halo: "rgba(255,140,130,0.3)",
		inner: "#FFE8CF",
		opacity: 0,
		outer: "#FF9E7C",
		scale: 1,
		x: 196,
		y: 330,
	},
};
/** A dimmer sun for dark themes: a deeper rim and a fainter halo. Late is unchanged (the sun has set). */
const SUN_DARK: Record<TodayPhase, Sun> = {
	dawn: {
		...SUN.dawn,
		halo: "rgba(230,120,90,0.26)",
		inner: "#E9C3AA",
		outer: "#B5674C",
	},
	day: {
		...SUN.day,
		halo: "rgba(235,205,140,0.26)",
		inner: "#F4ECD2",
		outer: "#D9B868",
	},
	evening: {
		...SUN.evening,
		halo: "rgba(220,100,110,0.26)",
		inner: "#E6B8A2",
		outer: "#AD5658",
	},
	late: SUN.late,
};
/** The disc's light sits up and left: `radial-gradient(circle at 45% 40%, inner, outer 72%)`. */
export const SUN_LIGHT = { cx: 0.45, cy: 0.4, stop: 0.72 } as const;
/** sunB: the halo breathes 1 → 1.04 and .92 → 1 over 6 s. */
export const HALO_BREATH = { low: 0.92, period: 6, scale: 0.04 } as const;

export const RIDGES = {
	back: "M0 48 C 54 26 112 22 172 38 C 226 52 280 18 336 22 C 362 24 380 30 390 34 V140 H0 Z",
	/** The bottom 36% fades out. */
	fadeFrom: 0.64,
	fills: {
		dawn: ["rgba(255,168,136,0.30)", "#FBE8E4"],
		day: ["rgba(160,160,232,0.20)", "#EBEEFA"],
		evening: ["rgba(232,128,168,0.30)", "#F8E1E2"],
		late: ["rgba(118,92,200,0.30)", "#161126"],
	} satisfies Record<TodayPhase, [string, string]>,
	/** Dark themes: a faint tinted back ridge and a front one close to the dark page. */
	fillsDark: {
		dawn: ["rgba(214,120,104,0.22)", "#2A1C26"],
		day: ["rgba(120,150,220,0.18)", "#1A2133"],
		evening: ["rgba(200,100,150,0.24)", "#2A1B2C"],
		late: ["rgba(118,92,200,0.30)", "#161126"],
	} satisfies Record<TodayPhase, [string, string]>,
	front: "M0 78 C 62 58 132 62 196 74 C 262 86 320 56 390 62 V140 H0 Z",
	height: 140,
	parallax: 0.22,
	top: 176,
};

/** Two pills drifting −14 → +24 pt, alternating; 1 by day, .4 at dawn. */
export const CLOUDS = [
	{ period: 38, reverse: false, w: 116, x: 22, y: 206 },
	{ period: 46, reverse: true, w: 84, x: 232, y: 226 },
] as const;
export const CLOUD = {
	blur: 5,
	color: "rgba(255,255,255,0.8)",
	from: -14,
	h: 15,
	to: 24,
} as const;
const CLOUD_OPACITY: Record<TodayPhase, number> = {
	dawn: 0.4,
	day: 1,
	evening: 0,
	late: 0,
};
/** White clouds would glare on a dark sky: a faint haze by day, a trace at dawn. */
const CLOUD_OPACITY_DARK: Record<TodayPhase, number> = {
	dawn: 0.08,
	day: 0.14,
	evening: 0,
	late: 0,
};

/** Everything in the sky that changes with the theme's light or dark. */
export type SkyLook = {
	gradients: Record<Day, Gradient>;
	sun: Record<TodayPhase, Sun>;
	ridges: Record<TodayPhase, [string, string]>;
	clouds: Record<TodayPhase, number>;
};
const LIGHT_LOOK: SkyLook = {
	clouds: CLOUD_OPACITY,
	gradients: GRADIENTS,
	ridges: RIDGES.fills,
	sun: SUN,
};
const DARK_LOOK: SkyLook = {
	clouds: CLOUD_OPACITY_DARK,
	gradients: GRADIENTS_DARK,
	ridges: RIDGES.fillsDark,
	sun: SUN_DARK,
};
export function skyLook(dark: boolean): SkyLook {
	return dark ? DARK_LOOK : LIGHT_LOOK;
}

/** [x, y, twinkle period s, delay s]. The first one is the evening's first star. */
export const STARS: readonly (readonly [number, number, number, number])[] = [
	[236, 96, 4, 0],
	[40, 88, 3, -0.4],
	[92, 170, 5, -1],
	[150, 76, 4, -2],
	[196, 158, 6, -0.6],
	[268, 182, 3, -1.6],
	[352, 118, 5, -2.4],
	[330, 214, 4, -0.2],
	[122, 118, 6, -3],
	[18, 150, 4, -1.2],
	[292, 58, 5, -0.8],
	[66, 52, 3, -2.2],
];
/** tw: scale 1 → .45 and opacity 1 → .55 at mid-loop. Stars fade in 1.2 s after 1.1 s. */
export const STAR = {
	color: [1, 0.965, 0.886],
	dim: 0.55,
	dot: 2.6,
	firstStar: 0.85,
	glow: 8.3,
	low: 0.45,
} as const;

/** [x, y, drift period s, flash period s, delay s]: amber, drifting ±9 / −20, blinking. */
export const EMBERS: readonly (readonly [
	number,
	number,
	number,
	number,
	number,
])[] = [
	[128, 196, 9, 4, 0],
	[168, 224, 11, 5, -2],
	[226, 206, 10, 3.5, -4],
	[262, 236, 12, 4.5, -1],
	[108, 238, 8, 5, -3],
	[318, 248, 10, 4, -5],
];
/** flyD keyframes (ease-in-out per segment) and the flash curve's floor. */
export const EMBER = {
	color: [1, 0.769, 0.42],
	dot: 4,
	floor: 0.15,
	glow: 12,
	path: [
		[0, 0, 0],
		[0.33, 9, -12],
		[0.66, -6, -20],
		[1, 0, 0],
	],
} as const;

export const MOON = {
	color: "#F7E6BF",
	cut: { dx: -10, dy: 4 },
	glow: "rgba(247,230,191,0.55)",
	rise: 50,
	size: 34,
	x: 300,
	y: 150,
} as const;

/** What shows above the sky if the page is pulled down: the sky's own top colour. */
export function skyTop(phase: TodayPhase, dark: boolean): string {
	if (phase === "late") {
		return LATE_GRADIENT.colors[0] ?? "";
	}
	return skyLook(dark).gradients[phase].colors[0] ?? "";
}
