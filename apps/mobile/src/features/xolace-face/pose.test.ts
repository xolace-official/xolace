import { describe, expect, it } from "vitest";

import {
	lerpPose,
	MOOD_POSES,
	NEUTRAL,
	PRESETS,
	poseForCheckIn,
	poseForSteadiness,
} from "./pose";

describe("lerpPose", () => {
	it("returns each end at t = 0 and t = 1", () => {
		expect(lerpPose(NEUTRAL, PRESETS.glad, 0)).toEqual(NEUTRAL);
		expect(lerpPose(NEUTRAL, PRESETS.glad, 1)).toEqual(PRESETS.glad);
	});

	it("blends every dial halfway at t = 0.5", () => {
		const mid = lerpPose(NEUTRAL, PRESETS.glad, 0.5);
		expect(mid.mouth).toBeCloseTo((NEUTRAL.mouth + PRESETS.glad.mouth) / 2);
		expect(mid.cheeks).toBeCloseTo((NEUTRAL.cheeks + PRESETS.glad.cheeks) / 2);
	});
});

describe("poseForCheckIn", () => {
	it("is the neutral face at 'the same'", () => {
		expect(poseForCheckIn(0.5)).toEqual(NEUTRAL);
	});

	it("smiles more the lighter it gets", () => {
		expect(poseForCheckIn(0.75).mouth).toBeGreaterThan(NEUTRAL.mouth);
		expect(poseForCheckIn(1).mouth).toBeGreaterThan(poseForCheckIn(0.75).mouth);
	});

	it("shows concern when heavier, but never a full frown", () => {
		const heaviest = poseForCheckIn(0);
		expect(heaviest.brow).toBeGreaterThan(0);
		expect(heaviest.mouth).toBeLessThan(0);
		expect(heaviest.mouth).toBeGreaterThan(-0.5);
	});

	it("clamps values outside 0–1", () => {
		expect(poseForCheckIn(-1)).toEqual(poseForCheckIn(0));
		expect(poseForCheckIn(2)).toEqual(poseForCheckIn(1));
	});
});

describe("poseForSteadiness", () => {
	it("never changes the mouth: steadiness isn't happiness", () => {
		for (const score of [0, 12, 45, 78, 100]) {
			expect(poseForSteadiness(score).mouth).toBe(NEUTRAL.mouth);
		}
	});

	it("gets calmer as steadiness rises", () => {
		expect(poseForSteadiness(20).restless).toBeGreaterThan(
			poseForSteadiness(80).restless
		);
		expect(poseForSteadiness(20).eyeOpen).toBeGreaterThan(
			poseForSteadiness(80).eyeOpen
		);
	});

	it("clamps scores outside 0–100", () => {
		expect(poseForSteadiness(150)).toEqual(poseForSteadiness(100));
		expect(poseForSteadiness(-5)).toEqual(poseForSteadiness(0));
	});
});

describe("MOOD_POSES", () => {
	it("gives no mood a look of its own: each is one of the face's presets", () => {
		const presets = Object.values(PRESETS);
		for (const pose of Object.values(MOOD_POSES)) {
			expect(presets).toContain(pose);
		}
	});

	it("looks up and away while thinking, and leans in while listening", () => {
		expect(MOOD_POSES.thinking.gazeY).toBeLessThan(0);
		expect(MOOD_POSES.thinking.gazeX).not.toBe(0);
		expect(MOOD_POSES.listening.lean).toBeGreaterThan(0);
	});

	it("is warm, not a grin, when echoing back what someone said", () => {
		expect(MOOD_POSES.warm.mouth).toBeGreaterThan(0);
		expect(MOOD_POSES.warm.mouth).toBeLessThan(MOOD_POSES.happy.mouth);
		expect(MOOD_POSES.warm.cheeks).toBeLessThan(MOOD_POSES.happy.cheeks);
	});

	it("smiles widest when happy, and only a little at rest", () => {
		expect(MOOD_POSES.happy.mouth).toBe(1);
		expect(MOOD_POSES.idle.mouth).toBeGreaterThan(0);
		expect(MOOD_POSES.idle.mouth).toBeLessThan(MOOD_POSES.happy.mouth);
	});
});
