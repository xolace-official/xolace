import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";

/**
 * Reflect's poses on production's dials (board `POSE`, line 815). Production's PRESETS are used
 * where the name matches (attentive, thinking, waiting, nod); these are the board's new ones.
 */
const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

export const FACE = {
	/** A heavy mirror: concern, never a grin. */
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
	/** The mirror glances up at your words while your phrases light. */
	glance: { ...PRESETS.nod, gazeX: -0.35, gazeY: -0.85 },
	/** Heard: eyes close into the crescent. */
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	/** Heard, before the 0.6 s arrival. */
	heardArrive: pose({ mouth: 0.3 }),
	/** Before the heavy mirror's concern lands (board, heavy before `mfn`). */
	heavyArrive: pose({
		brow: 0.3,
		cheeks: 0,
		eyeOpen: 0.8,
		gazeY: 0.2,
		mouth: 0,
		restless: 0,
	}),
	/** Not quite: looking down at the chosen line, brows a little up. */
	notQuite: pose({
		brow: 0.25,
		browLift: 0.35,
		gazeX: 0.25,
		gazeY: 0.75,
		lean: 0.12,
		mouth: 0.15,
	}),
	/** Not quite: picking a line. */
	pick: pose({ browLift: 0.3, gazeX: 0.2, gazeY: 0.7, mouth: 0.2 }),
	/** Heard, late: eyes close slowly to rest. */
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
	/** Where next: looking down at the tiles; a pick looks at that tile. */
	tiles: pose({ brow: 0.1, cheeks: 0.35, gazeX: 0.3, gazeY: 0.65, mouth: 0.3 }),
	/** The wait: watching the brush paint. */
	watch: pose({ browLift: 0.15, eyeOpen: 0.88, mouth: 0.2, restless: 0.04 }),
} as const;
