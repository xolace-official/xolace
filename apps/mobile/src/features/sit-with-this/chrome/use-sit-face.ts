import { useEffect } from "react";
import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import type { BeatKind, Stage } from "../sit-model";

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

const SIT_FACE = {
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	line: pose({
		browLift: 0.15,
		eyeOpen: 0.88,
		gazeY: 0.4,
		mouth: 0.25,
		restless: 0.04,
	}),
	rest: pose({
		cheeks: 0.35,
		eyeOpen: 0.04,
		mouth: 0.3,
		restless: 0,
		tilt: 0.12,
	}),
	watch: pose({ browLift: 0.15, eyeOpen: 0.88, mouth: 0.2, restless: 0.04 }),
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
