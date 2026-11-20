import { Easing } from "react-native-reanimated";

export const WARM = {
	ease: Easing.bezier(0, 0, 0.58, 1),
	fadeMs: 400,
	glowR: 12,
	holdMs: 450,
} as const;

export const FLY = {
	arc: 18,
	barOutMs: 220,
	fromScale: 1.24,
	spring: { damping: 17, mass: 1, stiffness: 130 },
	swell: 0.05,
} as const;

export const SPEAK = {
	dropFrom: 12,
	dropSpring: { damping: 19.8, mass: 1, stiffness: 324 },
	glowReach: 110,
	glowSpring: { damping: 21.6, mass: 1, stiffness: 144 },
	heldScale: 1.08,
	restSpread: 1.7,
} as const;

export const TEXTURE_OUT = { drop: 10, ms: 350 } as const;
export const NUDGE = {
	dayMs: 8000,
	ms: 500,
	nightMs: 14_000,
	rise: 6,
} as const;

export const ENSO = {
	bleedDelayMs: 300,
	bleedMs: 1000,
	blotMs: 500,
	cap: 0.85,
	closeMs: 420,
	dryDelayMs: 1200,
	dryMs: 2400,
	dryOpacity: 0.5,
	startDeg: -155,
	sweepDeg: 332,
	tau: 2,
} as const;

export const STAGE_LINE = {
	bandMs: 1400,
	blur: 6,
	ease: Easing.bezier(0.2, 0.8, 0.2, 1),
	ms: 450,
	rise: 10,
} as const;

export const WRITE_IN = {
	band: 0.45,
	base: 0.15,
	flashOut: 0.5,
	heavyStagger: 0.09,
	heavyWordIn: 0.6,
	lightAfter: 0.15,
	lightIn: 0.25,
	lightStagger: 0.3,
	rise: 8,
	stagger: 0.06,
	surge: 80,
	surgeIn: 0.18,
	surgeOut: 0.9,
	wordIn: 0.25,
} as const;

export const ACTIONS = {
	ease: Easing.bezier(0.455, 0.03, 0.515, 0.955),
	ms: 400,
	rise: 8,
	stepMs: 200,
} as const;
export const READ_ALOUD_AFTER_MS = 3600;
export const FLASH = { fadeMs: 400, grow: 0.2, outMs: 200 } as const;

export const PULL = {
	activeX: 12,
	arm: 40,
	arrowFrom: 0.55,
	dim: 0.38,
	failY: 12,
	k: 0.55,
	max: 110,
	settle: { damping: 26, mass: 1, stiffness: 300 },
} as const;
export const PANEL = {
	ease: Easing.bezier(0.32, 0.72, 0, 1),
	ms: 420,
} as const;
export const REWRITE_MOTION = {
	shimmerMs: 1100,
	startS: 1.1,
	wordS: 0.05,
} as const;

export const TIDE = {
	arch: 60,
	exhale: 3.3,
	hold: 0.6,
	inhale: 2,
	rest: 380,
	riseMs: 1200,
	top: 720,
} as const;
export const CARE_IN = { after: 0.5, ms: 700, rise: 30 } as const;
export const MORPH = {
	rise: 10,
	rowMs: 400,
	rowStaggerMs: 60,
	rowsAfterMs: 150,
	spring: { damping: 23.4, mass: 1, stiffness: 247 },
} as const;

export const TILES = {
	firstS: 0.12,
	goAfterMs: 1150,
	inMs: 380,
	lift: 4,
	rise: 8,
	stepS: 0.07,
	traceMs: 850,
} as const;

export const HEARD_MOTION = {
	bleedDelayMs: 200,
	bleedMs: 1400,
	chipDelayMs: 800,
	faceAfterMs: 600,
	restMs: 1800,
	subDelayMs: 700,
	wordDelayMs: 350,
	wordMs: 900,
} as const;

export const FACE_MOTION = {
	afterLitMs: 700,
	glanceMs: 1100,
	heavyNodMs: 1000,
	mirrorNodMs: 450,
} as const;

export const STAGE_FADE_MS = 400;
