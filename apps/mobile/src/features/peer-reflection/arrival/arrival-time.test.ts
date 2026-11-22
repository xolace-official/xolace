import { describe, expect, it } from "vitest";
import { T } from "../peers-look";
import { arrivalEnd } from "./arrival-end";
import { cardStart, landedAt, readAt, wordsIn } from "./arrival-time";

describe("the arrival (board T)", () => {
	it("starts card i at 560 + 420·i", () => {
		expect([0, 1, 2, 3].map(cardStart)).toEqual([560, 980, 1400, 1820]);
	});

	it("counts the cards landed", () => {
		expect(landedAt(T.first - 1, 4)).toBe(0);
		expect(landedAt(T.first, 4)).toBe(1);
		expect(landedAt(cardStart(2), 4)).toBe(3);
		expect(landedAt(10_000, 4)).toBe(4);
		expect(landedAt(10_000, 2)).toBe(2);
	});

	it("reads along 1.5 s after the last card", () => {
		expect(readAt(4)).toBe(cardStart(3) + 1500);
	});

	it("counts the title's words", () => {
		expect(wordsIn(["Others have felt", "something like this."])).toBe(6);
	});
});
