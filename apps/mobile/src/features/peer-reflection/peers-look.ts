export const LAYOUT = {
	band: { boardW: 390, height: 150, noneHeight: 236, noneShift: 64 },
	bridge: {
		dot: 8,
		gap: 10,
		line: 20.3,
		noneTop: 30,
		side: 44,
		size: 14,
		top: 22,
	},
	card: { padBottom: 14, padTop: 20, padX: 20, radius: 26 },
	cards: { gap: 12, side: 16, top: 24 },
	chip: {
		coreInset: 2.5,
		gap: 8,
		glyph: 15,
		height: 36,
		label: 13.5,
		labelLine: 18,
		padLeft: 11,
		padRight: 14,
		ring: 1.6,
		top: 14,
	},
	footer: {
		bottom: 56,
		fade: 168,
		fadeAt: 0.44,
		height: 56,
		hint: 13,
		hintBottom: 26,
		side: 16,
	},
	header: { button: 44, face: 40, side: 16, top: 54 },
	quote: { clamp: 7, line: 27, moreSize: 14, moreTop: 4, size: 19.5 },
	scroll: { bottom: 176, top: 100 },
	sub: { line: 22.5, side: 40, size: 15.5, top: 8 },
	title: { line: 32, side: 30, size: 30, top: 4, tracking: -0.9 },
	topFade: { after: 6, height: 118, ms: 300, solidTo: 0.58 },
} as const;

export const T = { first: 560, step: 420, title: 120, tStep: 160 } as const;

export const MOTION = {
	afterSheetMs: 380,
	doneMs: 450,
	heardMs: 1300,
	leaveFadeMs: 250,
	leaveMs: 420,
	loadingAfterMs: 300,
	readAfter: 1500,
	rise: { from: 28, ms: 620, omega: 17.3, opaqueAt: 0.4, zeta: 0.81 },
	subDelay: 500,
	subMs: 500,
	wordMs: 700,
} as const;

export const YOU = { x: 195, y: 122 } as const;
export const STAR = [
	[70, 66],
	[148, 30],
	[246, 36],
	[322, 72],
] as const;
export const CTRL = [
	[124, 110],
	[163, 84],
	[230, 88],
	[270, 112],
] as const;
export const CARD_STAR = [1, 2, 0, 3] as const;
export const MAX_CARDS = 4;
export const MARK_AT: readonly (readonly [number, number] | null)[] = [
	null,
	[173.4, 93.2],
	[216.6, 93.2],
	null,
];

export const DRAW = {
	blink: 12,
	core: 5.2,
	coreA: 0.62,
	coreHotW: 1.9,
	coreW: 1.2,
	dash: [0.006, 0.022],
	dotA: 0.5,
	dotHotA: 0.95,
	glowA: 0.3,
	glowBlur: 3,
	glowHotA: 0.62,
	glowHotW: 6,
	glowW: 4.5,
	halo: 22,
	haloA: 0.55,
	hotScale: 1.35,
	pl: 3.5,
	ring: 9,
	ringA: 0.5,
	ringW: 2,
	youCore: 7,
	youHalo: 30,
} as const;

export const TIMING = {
	blink: 900,
	blinkLead: 600,
	bloom: 550,
	bloomAt: 420,
	bloomFade: 300,
	cool: 700,
	draw: 600,
	fadeIn: 450,
	gone: 400,
	halo: 500,
	hotOn: 450,
	load: 1500,
	morph: 400,
	move: 700,
	pl: 620,
	ring: 3200,
	wave: 240,
} as const;

export const POINT = {
	farA: 0.45,
	farR: 27.5,
	nearA: 0.9,
	nearR: 14.5,
} as const;

export const CARD_LIGHT = {
	edge: {
		below: 10,
		blur: 22,
		dayA: [0.18, 0.26],
		height: 40,
		inset: 40,
		lateA: [0.12, 0.18],
		offMs: 700,
		onMs: 450,
	},
	inner: {
		cx: 0.78,
		cy: 1.18,
		offMs: 700,
		onMs: 450,
		positions: [0, 0.42, 0.68],
		rx: 1.2,
		ry: 0.8,
	},
} as const;

export const CHIP = {
	beatDelay: 80,
	beatMs: 430,
	coreMs: 350,
	labelMs: 300,
	labelRise: 6,
	ms: 450,
} as const;

export const SKY_SCALE = 0.38 / 0.6;
