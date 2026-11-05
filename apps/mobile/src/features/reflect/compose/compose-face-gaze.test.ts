import { describe, expect, it } from "vitest";
import { PRESETS } from "@/features/xolace-face/pose";
import {
	gazeAtWriting,
	leanPose,
	leanSteps,
	lineEnd,
} from "./compose-face-gaze";

describe("gazeAtWriting", () => {
	it("looks across at the prompt before anything is written", () => {
		const gaze = gazeAtWriting({ text: "", x: 0, y: 0 });
		expect(gaze.x).toBeGreaterThan(0);
		expect(gaze.y).toBeLessThan(0);
	});

	it("looks down at the words, further right the longer the line", () => {
		const short = gazeAtWriting({ text: "Hi", x: 0.1, y: 0.05 });
		const long = gazeAtWriting({ text: "Hi there, it's", x: 0.9, y: 0.05 });
		expect(short.y).toBeGreaterThan(0);
		expect(long.x).toBeGreaterThan(short.x);
		expect(long.y).toBeCloseTo(short.y);
	});

	it("looks lower once the writing wraps onto later lines", () => {
		const first = gazeAtWriting({ text: "a", x: 0.5, y: 0.05 });
		const wrapped = gazeAtWriting({ text: "a b", x: 0.5, y: 0.3 });
		expect(wrapped.y).toBeGreaterThan(first.y);
	});

	it("jumps to the left edge on a new line before layout has one", () => {
		const gaze = gazeAtWriting({ text: "Today\n", x: 0.4, y: 0.05 });
		expect(gaze).toEqual(gazeAtWriting({ text: "Today x", x: 0, y: 0.05 }));
	});
});

describe("lineEnd", () => {
	const box = { height: 400, width: 300 };

	it("is the last line's width and middle as fractions of the field", () => {
		const end = lineEnd({ height: 28, width: 150, y: 44 }, box);
		expect(end.x).toBeCloseTo(0.5);
		expect(end.y).toBeCloseTo(58 / 400);
	});

	it("clamps to the field", () => {
		expect(lineEnd({ height: 28, width: 400, y: 500 }, box)).toEqual({
			x: 1,
			y: 1,
		});
	});

	it("is the top-left corner with no line or no measured box", () => {
		expect(lineEnd(undefined, box)).toEqual({ x: 0, y: 0 });
		expect(
			lineEnd({ height: 28, width: 100, y: 0 }, { height: 0, width: 0 })
		).toEqual({ x: 0, y: 0 });
	});
});

describe("leanSteps", () => {
	it("steps once per 40 characters, not per keystroke", () => {
		expect(leanSteps(0)).toBe(0);
		expect(leanSteps(39)).toBe(0);
		expect(leanSteps(40)).toBe(1);
		expect(leanSteps(79)).toBe(1);
		expect(leanSteps(80)).toBe(2);
	});

	it("stops at 6", () => {
		expect(leanSteps(240)).toBe(6);
		expect(leanSteps(5000)).toBe(6);
	});
});

describe("leanPose", () => {
	it("starts from the attentive pose, upright", () => {
		const start = leanPose(0);
		expect(start.browLift).toBe(PRESETS.attentive.browLift);
		expect(start.gazeY).toBe(PRESETS.attentive.gazeY);
		expect(start.lean).toBe(0);
	});

	it("leans in and lifts its brows more with each step", () => {
		const one = leanPose(1);
		const six = leanPose(6);
		expect(six.lean).toBeGreaterThan(one.lean);
		expect(six.browLift).toBeGreaterThan(one.browLift);
		expect(six.mouth).toBe(PRESETS.attentive.mouth);
	});
});
