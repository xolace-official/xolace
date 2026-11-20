export const HELD_R = 125;
export const COIN_D = HELD_R * 2;

export type Pt = { x: number; y: number; r: number };
export type NamePt = { x: number; y: number; s: number };

export type Pose = {
	cx: number;
	cy: number;
	r: number;
	spin: number;
	tiltX: number;
	tiltY: number;
	roll: number;
	recede: number;
	spread: number;
	power: number;
	nameA: number;
	bloom: number;
	band: number;
	nx: number;
	ny: number;
	ns: number;
	alpha: number;
	dim: number;
	rvA: number[];
	rvY: number[];
	mt: number;
};

export const RV = {
	chrome: 5,
	date: 1,
	hint: 3,
	line: 0,
	share: 4,
	sparks: 2,
} as const;
const REVEALS = Object.keys(RV).length;

export const REST_POSE: Pose = {
	alpha: 0,
	band: -1,
	bloom: 0,
	cx: 0,
	cy: 0,
	dim: 0,
	mt: -1,
	nameA: 0,
	ns: 1,
	nx: 0,
	ny: 0,
	power: 0,
	r: HELD_R,
	recede: 0,
	roll: 0,
	rvA: Array.from({ length: REVEALS }, () => 0),
	rvY: Array.from({ length: REVEALS }, () => 0),
	spin: 0,
	spread: 0,
	tiltX: 0,
	tiltY: 0,
};
