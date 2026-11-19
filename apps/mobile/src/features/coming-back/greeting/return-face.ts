import { NEUTRAL, type Pose, PRESETS } from "@/components/xolace-face/pose";

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

/**
 * The face on the greeting (board `FACE_P`, handoff §3), its dials mapped as the session's are:
 * hp → eyeShape, eo → eyeOpen, m → mouth, ck → cheeks, sq → squash, gy → gazeY, bl → browLift,
 * rs → restless.
 */
export const GREET_FACE = {
	/** "Still here." */
	calm: pose({
		cheeks: 0.3,
		eyeOpen: 0.78,
		gazeY: 0.35,
		mouth: 0.3,
		restless: 0.04,
	}),
	/** A tick lands. */
	glad: pose({ cheeks: 0.85, eyeShape: 1, mouth: 1, squash: 0.2 }),
	/** Arriving: happy crescents (the board's `POSE.heard`, Reflect's `FACE.heard`). */
	heard: pose({ cheeks: 0.7, eyeShape: 1, mouth: 0.8, squash: 0.15 }),
	/** Acute: the list starts with a hard-night check-in (production's `nod` preset). */
	soft: PRESETS.nod,
	/** At rest: eyes on the list. */
	watch: pose({
		browLift: 0.15,
		cheeks: 0.35,
		eyeOpen: 0.9,
		gazeY: 0.65,
		mouth: 0.4,
		restless: 0.04,
	}),
} as const;

/** Board `openGreet` / `nod`: heard turns to watch 1.9 s after the card opens; glad holds 1.5 s. */
export const FACE_TIMING = { gladMs: 1500, restAfterMs: 1900 } as const;

/** Board `.gface`: 96 pt, top 86 above the card (72 / 64 in "Still here."). */
export const FACE_GEO = {
	/** Reduce Motion: `fadeIn .3s .2s`. */
	fade: { delay: 200, ms: 300 },
	greet: { size: 96, top: 86 },
	left: { size: 72, top: 64 },
	/** `faceUp .62s .3s`: from +90, 5 pt over at 70%. */
	rise: { at: 0.7, delay: 300, from: 90, ms: 620, over: 5 },
	/** `.ph.pg2 .gface`: sinks 100 behind the card, .42 s. */
	sink: { by: 100, ms: 420 },
} as const;
