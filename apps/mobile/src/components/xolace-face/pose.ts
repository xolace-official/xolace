export type Pose = {
	mouth: number;
	mouthOpen: number;
	brow: number;
	browLift: number;
	browAsym: number;
	eyeOpen: number;
	gazeX: number;
	gazeY: number;
	lean: number;
	tilt: number;
	squash: number;
	cheeks: number;
	restless: number;
	eyeShape: number;
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
	"eyeShape",
] as const satisfies readonly (keyof Pose)[];

export const NEUTRAL: Pose = {
	brow: 0,
	browAsym: 0,
	browLift: 0,
	cheeks: 0.25,
	eyeOpen: 1,
	eyeShape: 0,
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
	waiting: pose({
		eyeOpen: 0.55,
		gazeY: 0.15,
		mouth: 0.25,
		restless: 0.02,
		tilt: 0.1,
	}),
} satisfies Record<string, Pose>;

export const MOOD_POSES = {
	happy: PRESETS.glad,
	idle: PRESETS.neutral,
	listening: PRESETS.attentive,
	talking: PRESETS.speaking,
	thinking: PRESETS.thinking,
	warm: PRESETS.nod,
} as const satisfies Record<string, Pose>;

export type Mood = keyof typeof MOOD_POSES;

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
	"worklet";
	const out = { ...a };
	for (const k of POSE_KEYS) {
		out[k] = a[k] + (b[k] - a[k]) * t;
	}
	return out;
}

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

export function poseForCheckIn(value: number): Pose {
	"worklet";
	const v = Math.min(1, Math.max(0, value));
	return v < 0.5
		? lerpPose(HEAVY, NEUTRAL, v * 2)
		: lerpPose(NEUTRAL, LIGHT, (v - 0.5) * 2);
}

const STEADINESS_MAX = 100;

export function poseForSteadiness(steadiness: number): Pose {
	const unsteady =
		1 - Math.min(STEADINESS_MAX, Math.max(0, steadiness)) / STEADINESS_MAX;
	return pose({
		brow: 0.25 * unsteady,
		eyeOpen: 0.75 + 0.25 * unsteady,
		restless: 0.05 + 0.95 * unsteady,
	});
}
