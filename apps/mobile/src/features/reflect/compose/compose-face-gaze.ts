// Where the composer's face looks and how far it leans, from what you've written. Pure, so
// the mapping is tested apart from the layout that measures it.

import { type Pose, PRESETS } from "@/features/xolace-face/pose";

/** Where the writing ends: the last line's end across the field (x) and down it (y), 0–1. */
export type Writing = { text: string; x: number; y: number };

/** A glance away from the pose's own gaze, in the face's gaze units. */
type Gaze = { x: number; y: number };

/** Closed: straight ahead, on the pose's own gaze. */
export const GAZE_AHEAD: Gaze = { x: 0, y: 0 };
/** After a pause in your writing it looks up at you. */
export const GAZE_AT_YOU: Gaze = { x: 0, y: -0.2 };
/** Before you write, across at the prompt beside it in the header row. */
const GAZE_AT_PROMPT: Gaze = { x: 0.6, y: -0.1 };

// The field sits below and to the right of the face: its left edge is a little left of
// straight down, its right edge well across.
const WORDS_LEFT = -0.2;
const WORDS_SPAN = 1.1;
const WORDS_TOP = 0.35;
const WORDS_DEPTH = 0.55;

const CHARS_PER_LEAN_STEP = 40;
const MAX_LEAN_STEPS = 6;

/** Where to look while you write: the end of your last line, or the prompt before you start. */
export function gazeAtWriting({ text, x, y }: Writing): Gaze {
	if (text.length === 0) {
		return GAZE_AT_PROMPT;
	}
	// A new line ("\n") starts at the left before the layout has a line for it.
	const endX = text.endsWith("\n") ? 0 : x;
	return {
		x: WORDS_LEFT + endX * WORDS_SPAN,
		y: WORDS_TOP + y * WORDS_DEPTH,
	};
}

/** A laid-out line, as `onTextLayout` reports it. */
export type Line = { height: number; width: number; y: number };
type Box = { height: number; width: number };

/** The last laid-out line's end as fractions of the field. */
export function lineEnd(last: Line | undefined, box: Box) {
	if (!last || box.width <= 0) {
		return { x: 0, y: 0 };
	}
	return {
		x: Math.min(1, last.width / box.width),
		y: Math.min(1, (last.y + last.height / 2) / Math.max(box.height, 1)),
	};
}

/** One step per ~40 characters, up to 6: it leans in per few lines, never per keystroke. */
export function leanSteps(length: number): number {
	return Math.min(MAX_LEAN_STEPS, Math.floor(length / CHARS_PER_LEAN_STEP));
}

/** The attentive pose, leaning in and lifting its brows a little more each step. */
export function leanPose(steps: number): Pose {
	return {
		...PRESETS.attentive,
		browLift: PRESETS.attentive.browLift + steps * 0.05,
		lean: steps * 0.07,
		squash: -steps * 0.02,
	};
}
