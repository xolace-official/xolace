import type { Pose } from "./pose";

export const FACE_BOX = 100;
export const HEAD_PERSPECTIVE = 400;
export const HEAD_ORIGIN = { x: 50, y: 92 } as const;

const BREATH_HZ = 1.7;
const BREATH_X = 0.006;
const BREATH_Y = 0.012;
const FIDGET_HZ = 4.7;
const FIDGET_DEG = 2.5;
const NOD_DROP = 0.03;
const HOP_RISE = 0.08;
const HOP_STRETCH = 0.05;
const LEAN_DEG = 24;
const TILT_DEG = 12;
const SQUASH = 0.08;

export type HeadMotion = {
	drop: number;
	lean: number;
	roll: number;
	scaleX: number;
	scaleY: number;
};

export function headMotion(
	pose: Pick<Pose, "lean" | "restless" | "squash" | "tilt">,
	clock: number,
	nod: number,
	hop: number
): HeadMotion {
	"worklet";
	const breath = Math.sin(clock * BREATH_HZ);
	const fidget = Math.sin(clock * FIDGET_HZ) * pose.restless * FIDGET_DEG;
	return {
		drop: nod * NOD_DROP - hop * HOP_RISE,
		lean: pose.lean * LEAN_DEG,
		roll: pose.tilt * TILT_DEG + fidget,
		scaleX: 1 + pose.squash * SQUASH - breath * BREATH_X,
		scaleY: 1 - pose.squash * SQUASH + breath * BREATH_Y + hop * HOP_STRETCH,
	};
}
