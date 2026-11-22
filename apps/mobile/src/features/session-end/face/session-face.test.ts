import { describe, expect, it } from "vitest";
import { NEUTRAL, poseForCheckIn } from "@/components/xolace-face/pose";
import { checkInPose } from "./session-face";

describe("checkInPose", () => {
	it("is the neutral face at 'the same'", () => {
		expect(checkInPose(0.5)).toEqual(NEUTRAL);
	});

	it("matches production's check-in on the lighter half", () => {
		for (const v of [0.6, 0.75, 0.9, 1]) {
			expect(checkInPose(v)).toEqual(poseForCheckIn(v));
		}
	});

	it("lets the smile go sooner on the heavier half", () => {
		expect(poseForCheckIn(0.4).mouth).toBeGreaterThan(0.2);
		expect(checkInPose(0.4).mouth).toBeLessThan(poseForCheckIn(0.4).mouth);
		expect(checkInPose(0).mouth).toBeCloseTo(poseForCheckIn(0).mouth);
		expect(checkInPose(0).cheeks).toBeCloseTo(0);
	});

	it("keeps every other dial linear", () => {
		expect(checkInPose(0.25).brow).toBeCloseTo(poseForCheckIn(0.25).brow);
		expect(checkInPose(0.25).squash).toBeCloseTo(poseForCheckIn(0.25).squash);
	});
});
