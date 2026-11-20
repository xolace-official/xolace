import { type Pose, PRESETS } from "@/components/xolace-face/pose";

export type Writing = { text: string; x: number; y: number };

type Gaze = { x: number; y: number };

export const GAZE_AT_YOU: Gaze = { x: 0, y: -0.2 };
const GAZE_AT_PROMPT: Gaze = { x: 0.6, y: -0.1 };

const WORDS_LEFT = -0.2;
const WORDS_SPAN = 1.1;
const WORDS_TOP = 0.35;
const WORDS_DEPTH = 0.55;

const CHARS_PER_LEAN_STEP = 40;
const MAX_LEAN_STEPS = 6;

export function gazeAtWriting({ text, x, y }: Writing): Gaze {
	if (text.length === 0) {
		return GAZE_AT_PROMPT;
	}
	const endX = text.endsWith("\n") ? 0 : x;
	return {
		x: WORDS_LEFT + endX * WORDS_SPAN,
		y: WORDS_TOP + y * WORDS_DEPTH,
	};
}

export type Line = { height: number; width: number; y: number };
type Box = { height: number; width: number };

export function lineEnd(last: Line | undefined, box: Box) {
	if (!last || box.width <= 0) {
		return { x: 0, y: 0 };
	}
	return {
		x: Math.min(1, last.width / box.width),
		y: Math.min(1, (last.y + last.height / 2) / Math.max(box.height, 1)),
	};
}

export function leanSteps(length: number): number {
	return Math.min(MAX_LEAN_STEPS, Math.floor(length / CHARS_PER_LEAN_STEP));
}

export function leanPose(steps: number): Pose {
	return {
		...PRESETS.attentive,
		browLift: PRESETS.attentive.browLift + steps * 0.05,
		lean: steps * 0.07,
		squash: -steps * 0.02,
	};
}
