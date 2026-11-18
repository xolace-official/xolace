import { describe, expect, it } from "vitest";
import {
	asksFollowUp,
	centreOf,
	followUpBucket,
	hasSparkle,
	moodOf,
	SAME,
	snap,
	stepBy,
	stepOf,
	wordsFor,
} from "./mood-scale";

describe("snap", () => {
	it("pulls positions near the centre onto the same", () => {
		expect(snap(0.47)).toBe(SAME);
		expect(snap(0.55)).toBe(SAME);
	});

	it("leaves positions past the magnet alone", () => {
		expect(snap(0.4)).toBe(0.4);
		expect(snap(0.6)).toBe(0.6);
	});
});

describe("stepOf", () => {
	it("is 0 only at the centre", () => {
		expect(stepOf(SAME)).toBe(0);
	});

	it("starts each half at step 1 just past the magnet", () => {
		expect(stepOf(0.43)).toBe(-1);
		expect(stepOf(0.57)).toBe(1);
	});

	it("has five steps per half, in order, reaching 5 at each end", () => {
		expect([0.6, 0.7, 0.8, 0.9, 1].map(stepOf)).toEqual([1, 2, 3, 4, 5]);
		expect([0.4, 0.3, 0.2, 0.1, 0].map(stepOf)).toEqual([-1, -2, -3, -4, -5]);
	});
});

describe("moodOf and wordsFor", () => {
	it("maps steps to the saved word", () => {
		expect(moodOf(0)).toBe("same");
		expect(moodOf(-3)).toBe("heavier");
		expect(moodOf(2)).toBe("lighter");
	});

	it("grades the word: a little, plain, much", () => {
		expect([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map(wordsFor)).toEqual([
			"much heavier",
			"much heavier",
			"heavier",
			"a little heavier",
			"a little heavier",
			"the same",
			"a little lighter",
			"a little lighter",
			"lighter",
			"much lighter",
			"much lighter",
		]);
	});
});

describe("hasSparkle", () => {
	it("sparkles from 'lighter' up, never unanswered", () => {
		expect(hasSparkle(null)).toBe(false);
		expect(hasSparkle(2)).toBe(false);
		expect(hasSparkle(3)).toBe(true);
		expect(hasSparkle(5)).toBe(true);
	});
});

describe("the heavier follow-up", () => {
	it("asks only from step −3 down", () => {
		expect(asksFollowUp(null)).toBe(false);
		expect(asksFollowUp(-2)).toBe(false);
		expect(asksFollowUp(-3)).toBe(true);
		expect(asksFollowUp(-5)).toBe(true);
	});

	it("asks the heavier question from −4", () => {
		expect(followUpBucket(-3)).toBe("mid");
		expect(followUpBucket(-4)).toBe("high");
		expect(followUpBucket(-5)).toBe("high");
	});
});

describe("VoiceOver's one step", () => {
	it("lands each step's centre inside that step", () => {
		for (const step of [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]) {
			expect(stepOf(snap(centreOf(step)))).toBe(step);
		}
	});

	it("moves one step from the centre and stops at the ends", () => {
		expect(stepBy(null, 1)).toBe(1);
		expect(stepBy(null, -1)).toBe(-1);
		expect(stepBy(5, 1)).toBe(5);
		expect(stepBy(-5, -1)).toBe(-5);
	});
});
