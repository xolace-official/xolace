import { useEffect } from "react";
import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import type { BeatKind, Stage } from "../sit-model";

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

/** Handoff §7, on production's dials (board `POSE`). */
const SIT_FACE = {
	/** You stayed: the crescent eyes, then a hop. */
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	/** Lines: looking down at the words. */
	line: pose({
		browLift: 0.15,
		eyeOpen: 0.88,
		gazeY: 0.4,
		mouth: 0.25,
		restless: 0.04,
	}),
	/** Breathing, and feeling the hand: eyes closed. */
	rest: pose({
		cheeks: 0.35,
		eyeOpen: 0.04,
		mouth: 0.3,
		restless: 0,
		tilt: 0.12,
	}),
	/** The first screen: watching. */
	watch: pose({ browLift: 0.15, eyeOpen: 0.88, mouth: 0.2, restless: 0.04 }),
	/** Writing: watching the field. */
	write: pose({ browLift: 0.25, eyeOpen: 0.9, gazeY: 0.45, mouth: 0.2 }),
} as const;

function poseFor(stage: Stage, kind: BeatKind, waiting: boolean): Pose {
	if (stage === "close") {
		return SIT_FACE.heard;
	}
	if (waiting) {
		return PRESETS.waiting;
	}
	if (stage === "pre") {
		return SIT_FACE.watch;
	}
	switch (kind) {
		case "breath":
		case "sync":
		case "haptic":
			return SIT_FACE.rest;
		case "prompt":
			return SIT_FACE.write;
		default:
			return SIT_FACE.line;
	}
}

type Args = {
	stage: Stage;
	kind: BeatKind;
	waiting: boolean;
	running: boolean;
};

/**
 * The face in the header: it watches the first screen, looks down at a line,
 * closes its eyes to breathe (and to feel the hand), watches the field while
 * you write, waits while paused or while the sheet is up, and at the end
 * smiles with its eyes and hops once.
 */
export function useSitFace({ stage, kind, waiting, running }: Args) {
	const face = useFace(SIT_FACE.watch, running);
	const next = poseFor(stage, kind, waiting);
	const { to, hop } = face;
	useEffect(() => {
		to(next);
	}, [next, to]);
	useEffect(() => {
		if (stage === "close") {
			hop();
		}
	}, [stage, hop]);
	return face;
}
