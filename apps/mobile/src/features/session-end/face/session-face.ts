import {
	lerpPose,
	NEUTRAL,
	type Pose,
	PRESETS,
} from "@/components/xolace-face/pose";
import { SAME } from "../mood-scale";

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

const HEAVY = pose({
	brow: 0.7,
	cheeks: 0,
	eyeOpen: 0.6,
	gazeY: 0.6,
	mouth: -0.3,
	restless: 0,
	squash: 0.4,
	tilt: 0.25,
});
const LIGHT = pose({ cheeks: 0.8, eyeOpen: 0.85, mouth: 1, squash: -0.2 });

export function checkInPose(value: number): Pose {
	"worklet";
	const x = Math.min(1, Math.max(0, value));
	if (x >= SAME) {
		return lerpPose(NEUTRAL, LIGHT, (x - SAME) * 2);
	}
	const t = (SAME - x) * 2;
	const e = 1 - (1 - t) * (1 - t) * (1 - t);
	const p = lerpPose(NEUTRAL, HEAVY, t);
	p.mouth = NEUTRAL.mouth + (HEAVY.mouth - NEUTRAL.mouth) * e;
	p.cheeks = NEUTRAL.cheeks + (HEAVY.cheeks - NEUTRAL.cheeks) * e;
	return p;
}

export const SESSION_FACE = {
	concern: pose({
		brow: 0.55,
		cheeks: 0,
		eyeOpen: 0.72,
		gazeY: 0.35,
		mouth: -0.12,
		restless: 0,
		squash: 0.15,
		tilt: 0.2,
	}),
	glad: PRESETS.glad,
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	nod: PRESETS.nod,
	rest: pose({
		cheeks: 0.35,
		eyeOpen: 0.04,
		mouth: 0.3,
		restless: 0,
		tilt: 0.12,
	}),
	star: pose({
		cheeks: 0.75,
		eyeShape: 1,
		gazeY: 0.8,
		mouth: 0.85,
		squash: 0.12,
	}),
	thinking: PRESETS.thinking,
	watch: pose({
		browLift: 0.15,
		eyeOpen: 0.9,
		gazeY: 0.5,
		mouth: 0.3,
		restless: 0.04,
	}),
} as const;
