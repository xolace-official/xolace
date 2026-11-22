import type { TodayPhase } from "../today-model";

export const SKY = { h: 420, w: 390 } as const;

type Day = Exclude<TodayPhase, "late">;
type Gradient = { colors: string[]; positions: number[] };
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
export const SUN_LIGHT = { cx: 0.45, cy: 0.4, stop: 0.72 } as const;
export const HALO_BREATH = { low: 0.92, period: 6, scale: 0.04 } as const;

export const RIDGES = {
	back: "M0 48 C 54 26 112 22 172 38 C 226 52 280 18 336 22 C 362 24 380 30 390 34 V140 H0 Z",
	fadeFrom: 0.64,
	fills: {
		dawn: ["rgba(255,168,136,0.30)", "#FBE8E4"],
		day: ["rgba(160,160,232,0.20)", "#EBEEFA"],
		evening: ["rgba(232,128,168,0.30)", "#F8E1E2"],
		late: ["rgba(118,92,200,0.30)", "#161126"],
	} satisfies Record<TodayPhase, [string, string]>,
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
const CLOUD_OPACITY_DARK: Record<TodayPhase, number> = {
	dawn: 0.08,
	day: 0.14,
	evening: 0,
	late: 0,
};

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
export const STAR = {
	color: [1, 0.965, 0.886],
	dim: 0.55,
	dot: 2.6,
	firstStar: 0.85,
	glow: 8.3,
	low: 0.45,
} as const;

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

export function skyTop(phase: TodayPhase, dark: boolean): string {
	if (phase === "late") {
		return LATE_GRADIENT.colors[0] ?? "";
	}
	return skyLook(dark).gradients[phase].colors[0] ?? "";
}
