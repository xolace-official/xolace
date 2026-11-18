// How the whole face moves, for every renderer: `XolaceFace` maps it onto a view transform,
// `FaceDrawing` onto a Skia matrix. The features move inside the body on their own.

import type { Pose } from "./pose";

/** Bodies and features are drawn in a 100 × 100 box, scaled to the face's size. */
export const FACE_BOX = 100;
/** The head's perspective, in points. */
export const HEAD_PERSPECTIVE = 400;
/**
 * Turn and squash from the base, so it sits on its spot rather than spinning. In the box's
 * units, which are also percentages of the face (50% 92%).
 */
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
	/** How far down it sits, as a fraction of the face's size (a hop is negative). */
	drop: number;
	/** The 3D turn, in degrees. */
	lean: number;
	/** The head roll with its fidget, in degrees. */
	roll: number;
	scaleX: number;
	scaleY: number;
};

/**
 * The head now: a nod drops it, a hop lifts and stretches it, the pose leans, rolls and squashes
 * it, a restless pose fidgets, and it always breathes.
 */
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
