import { describe, expect, it } from "vitest";
import { nextNow } from "./first-run-motion";

describe("the engines' clock", () => {
	it("starts at the first frame's timestamp", () => {
		expect(nextNow(0, { timeSincePreviousFrame: null, timestamp: 5000 })).toBe(
			5000
		);
	});

	it("resumes where it stopped after skipped frames", () => {
		expect(
			nextNow(5000, { timeSincePreviousFrame: 9000, timestamp: 14_000 })
		).toBe(5100);
	});

	it("steps by the frame", () => {
		expect(nextNow(5000, { timeSincePreviousFrame: 16, timestamp: 5016 })).toBe(
			5016
		);
	});
});
