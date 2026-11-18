import { describe, expect, it } from "vitest";
import { toExercise } from "./catalogue";
import {
	LET_IT_LAND,
	MAKE_ROOM,
	REFLECT_SLOTS,
	RESET,
	SOFTEN_TOWARD_IT,
	SPEAK_TO_IT,
} from "./dev/fixtures";
import { durOf, lengthLabel, shortLength, threadWeights } from "./sit-timing";

const land = toExercise(LET_IT_LAND, REFLECT_SLOTS);

describe("durations", () => {
	it("writes a line in first, then holds it at least the catalogue's time", () => {
		// 11 words: (11 − 1)·120 + 700 = 1900, then max(4000, 1200 + 11·320) = 4720.
		expect(durOf(land.beats[0])).toBe(1900 + 4720);
	});

	it("breathes for whole cycles, and a prompt waits", () => {
		expect(durOf(land.beats[2])).toBe(2 * 13_000);
		expect(durOf({ k: "prompt", t: "?" })).toBe(Number.POSITIVE_INFINITY);
	});

	it("counts a prompt as 10 s on the thread", () => {
		const speak = toExercise(SPEAK_TO_IT, REFLECT_SLOTS);
		expect(threadWeights(speak.beats)[3]).toBe(10);
	});

	it("says each exercise's real length", () => {
		expect(lengthLabel(land)).toBe("About a minute. Stay with it.");
		expect(lengthLabel(toExercise(SPEAK_TO_IT, REFLECT_SLOTS))).toBe(
			"About 45 seconds. Stay with it."
		);
		expect(shortLength(toExercise(RESET, {}))).toBe("about a minute");
	});
});
