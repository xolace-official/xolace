import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

export const FACE = {
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
	glance: { ...PRESETS.nod, gazeX: -0.35, gazeY: -0.85 },
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	heardArrive: pose({ mouth: 0.3 }),
	heavyArrive: pose({
		brow: 0.3,
		cheeks: 0,
		eyeOpen: 0.8,
		gazeY: 0.2,
		mouth: 0,
		restless: 0,
	}),
	notQuite: pose({
		brow: 0.25,
		browLift: 0.35,
		gazeX: 0.25,
		gazeY: 0.75,
		lean: 0.12,
		mouth: 0.15,
	}),
	pick: pose({ browLift: 0.3, gazeX: 0.2, gazeY: 0.7, mouth: 0.2 }),
	rest: pose({
		cheeks: 0.35,
		eyeOpen: 0.04,
		mouth: 0.3,
		restless: 0,
		tilt: 0.12,
	}),
	tile: (i: number) =>
		pose({
			browLift: 0.3,
			cheeks: 0.35,
			gazeX: 0.45,
			gazeY: Math.min(1, 0.45 + i * 0.25),
			lean: 0.1,
			mouth: 0.3,
		}),
	tiles: pose({ brow: 0.1, cheeks: 0.35, gazeX: 0.3, gazeY: 0.65, mouth: 0.3 }),
	watch: pose({ browLift: 0.15, eyeOpen: 0.88, mouth: 0.2, restless: 0.04 }),
} as const;
