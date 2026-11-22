import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

export const GREET_FACE = {
	calm: pose({
		cheeks: 0.3,
		eyeOpen: 0.78,
		gazeY: 0.35,
		mouth: 0.3,
		restless: 0.04,
	}),
	glad: pose({ cheeks: 0.85, eyeShape: 1, mouth: 1, squash: 0.2 }),
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	soft: PRESETS.nod,
	watch: pose({
		browLift: 0.15,
		cheeks: 0.35,
		eyeOpen: 0.9,
		gazeY: 0.65,
		mouth: 0.4,
		restless: 0.04,
	}),
} as const;

export const FACE_TIMING = { gladMs: 1500, restAfterMs: 1900 } as const;

export const FACE_GEO = {
	fade: { delay: 200, ms: 300 },
	greet: { size: 96, top: 86 },
	left: { size: 72, top: 64 },
	rise: { at: 0.7, delay: 300, from: 90, ms: 620, over: 5 },
	sink: { by: 100, ms: 420 },
} as const;
