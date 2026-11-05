import { describe, expect, it } from "vitest";
import {
	hasSparkle,
	heavierIntensity,
	intensityBucket,
	moodOf,
	SAME,
	snap,
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

	it("reaches step 5 at each end", () => {
		expect(stepOf(0)).toBe(-5);
		expect(stepOf(1)).toBe(5);
	});

	it("has five steps per half, in order", () => {
		const lighter = [0.6, 0.7, 0.8, 0.9, 1].map(stepOf);
		expect(lighter).toEqual([1, 2, 3, 4, 5]);
		const heavier = [0.4, 0.3, 0.2, 0.1, 0].map(stepOf);
		expect(heavier).toEqual([-1, -2, -3, -4, -5]);
	});
});

describe("moodOf", () => {
	it("maps steps to the saved word", () => {
		expect(moodOf(0)).toBe("same");
		expect(moodOf(-3)).toBe("heavier");
		expect(moodOf(2)).toBe("lighter");
	});
});

describe("intensityBucket", () => {
	it("buckets 1–5 as ≤2 low, 3 mid, ≥4 high", () => {
		expect([1, 2, 3, 4, 5].map(intensityBucket)).toEqual([
			"low",
			"low",
			"mid",
			"high",
			"high",
		]);
	});
});

describe("wordsFor", () => {
	it("follows the buckets in both directions", () => {
		expect([-1, -2, -3, -4, -5].map(wordsFor)).toEqual([
			"a little heavier",
			"a little heavier",
			"heavier",
			"much heavier",
			"much heavier",
		]);
		expect([1, 3, 5].map(wordsFor)).toEqual([
			"a little lighter",
			"lighter",
			"much lighter",
		]);
		expect(wordsFor(0)).toBe("the same");
	});
});

describe("hasSparkle", () => {
	it("starts at lighter (step 3), not a little lighter", () => {
		expect([0, 1, 2, 3, 4, 5].map(hasSparkle)).toEqual([
			false,
			false,
			false,
			true,
			true,
			true,
		]);
		expect(hasSparkle(-5)).toBe(false);
	});
});

describe("heavierIntensity", () => {
	it("is the drag depth for heavier positions", () => {
		expect(heavierIntensity(0.4)).toBe(1);
		expect(heavierIntensity(0.2)).toBe(3);
		expect(heavierIntensity(0)).toBe(5);
	});

	it("is 0 for the same or lighter", () => {
		expect(heavierIntensity(0.48)).toBe(0);
		expect(heavierIntensity(0.9)).toBe(0);
	});
});
