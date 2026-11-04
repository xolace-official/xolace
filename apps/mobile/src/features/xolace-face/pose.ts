// The face as continuous dials instead of fixed moods. Every input (a check-in, steadiness,
// what a talk is doing) maps to a point in this space, and the face springs between them.

export type Pose = {
	/** -1 frown … 1 smile */
	mouth: number;
	/** 0 closed … 1 small "o" */
	mouthOpen: number;
	/** -1 inner ends down (focused) … 1 inner ends up (concern) */
	brow: number;
	/** -1 lowered … 1 raised */
	browLift: number;
	/** -1 left brow up … 1 right brow up (curiosity) */
	browAsym: number;
	/** 0 shut … 1 open */
	eyeOpen: number;
	/** -1 … 1, where the pupils point */
	gazeX: number;
	gazeY: number;
	/** -1 … 1, 3D turn of the whole body */
	lean: number;
	/** -1 … 1, head roll */
	tilt: number;
	/** -1 tall … 1 squashed */
	squash: number;
	/** 0 … 1 blush */
	cheeks: number;
	/** 0 still … 1 fidgety idle motion */
	restless: number;
};

const POSE_KEYS = [
	"mouth",
	"mouthOpen",
	"brow",
	"browLift",
	"browAsym",
	"eyeOpen",
	"gazeX",
	"gazeY",
	"lean",
	"tilt",
	"squash",
	"cheeks",
	"restless",
] as const satisfies readonly (keyof Pose)[];

export const NEUTRAL: Pose = {
	brow: 0,
	browAsym: 0,
	browLift: 0,
	cheeks: 0.25,
	eyeOpen: 1,
	gazeX: 0,
	gazeY: 0,
	lean: 0,
	mouth: 0.35,
	mouthOpen: 0,
	restless: 0.15,
	squash: 0,
	tilt: 0,
};

const pose = (p: Partial<Pose>): Pose => ({ ...NEUTRAL, ...p });

export const PRESETS = {
	attentive: pose({ browLift: 0.25, gazeY: 0.2, lean: 0.15, mouth: 0.2 }),
	glad: pose({ cheeks: 0.8, eyeOpen: 0.75, mouth: 1, squash: 0.25 }),
	neutral: NEUTRAL,
	// Delivering a mirror: warm and soft, not a grin. Mirrors are often about something heavy.
	nod: pose({
		brow: 0.35,
		cheeks: 0.3,
		eyeOpen: 0.85,
		gazeY: 0.3,
		mouth: 0.2,
		tilt: 0.15,
	}),
	speaking: pose({ eyeOpen: 0.9, mouth: 0.25 }),
	thinking: pose({
		brow: -0.2,
		browLift: 0.4,
		gazeX: 0.5,
		gazeY: -0.7,
		mouth: 0,
		restless: 0.35,
		tilt: -0.2,
	}),
	// Calm and softly lidded: waiting, not asleep, not judged (steadiness before it can be read).
	waiting: pose({
		eyeOpen: 0.55,
		gazeY: 0.15,
		mouth: 0.25,
		restless: 0.02,
		tilt: 0.1,
	}),
} satisfies Record<string, Pose>;

/** Flux's live moods (onboarding-v2 README § Live Flux), on the presets above: no mood gets a
 * look of its own, so a face means the same thing in the intake as everywhere else. */
export const MOOD_POSES = {
	happy: PRESETS.glad,
	idle: PRESETS.neutral,
	listening: PRESETS.attentive,
	talking: PRESETS.speaking,
	thinking: PRESETS.thinking,
} as const satisfies Record<string, Pose>;

export type Mood = keyof typeof MOOD_POSES;

const SYLLABLE_HZ = 2.8;
const PHRASE_HZ = 0.9;
const TALK_MOUTH_MIN = 0.1;
const TALK_MOUTH_RANGE = 0.55;

/** `mouthOpen` while talking, from the face's clock in seconds: syllable-fast open and close,
 * swelling and easing with a slower phrase rhythm so it never visibly loops. */
export function mouthWhileTalking(seconds: number): number {
	"worklet";
	const syllable = Math.abs(Math.sin(seconds * SYLLABLE_HZ * Math.PI));
	const phrase = 0.7 + 0.3 * Math.sin(seconds * PHRASE_HZ * Math.PI * 2);
	return TALK_MOUTH_MIN + TALK_MOUTH_RANGE * syllable * phrase;
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
	"worklet";
	const out = { ...a };
	for (const k of POSE_KEYS) {
		out[k] = a[k] + (b[k] - a[k]) * t;
	}
	return out;
}

// Heavy is warm concern, never crying: the face doesn't mirror sadness at full strength.
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

/** Self-report, 0 heavier … 0.5 the same … 1 lighter. The user picks the face; the app never
 * assigns one. A worklet, so a slider can drive it on the UI thread. */
export function poseForCheckIn(value: number): Pose {
	"worklet";
	const v = Math.min(1, Math.max(0, value));
	return v < 0.5
		? lerpPose(HEAVY, NEUTRAL, v * 2)
		: lerpPose(NEUTRAL, LIGHT, (v - 0.5) * 2);
}

const STEADINESS_MAX = 100;

/** Steadiness 0–100 shows as calm vs restless motion only. Steadiness isn't happiness, so the
 * mouth never changes. */
export function poseForSteadiness(steadiness: number): Pose {
	const unsteady =
		1 - Math.min(STEADINESS_MAX, Math.max(0, steadiness)) / STEADINESS_MAX;
	return pose({
		brow: 0.25 * unsteady,
		eyeOpen: 0.75 + 0.25 * unsteady,
		restless: 0.05 + 0.95 * unsteady,
	});
}
