import { describe, expect, it } from "vitest";
import { rollFor, rollingFaceRole } from "./rolling-number-face";

describe("rollingFaceRole", () => {
	it("sets the digits in the body face of their weight; heavy is the pair's bold", () => {
		expect(rollingFaceRole("regular", false)).toBe("normal");
		expect(rollingFaceRole("semibold", false)).toBe("semibold");
		expect(rollingFaceRole("bold", false)).toBe("bold");
		expect(rollingFaceRole("heavy", false)).toBe("bold");
	});

	it("uses the heading face for display, whatever the weight", () => {
		expect(rollingFaceRole("regular", true)).toBe("display");
		expect(rollingFaceRole("heavy", true)).toBe("display");
	});
});

describe("rollFor", () => {
	it("springs by default, eases out quick, and swaps with reduced motion", () => {
		expect(rollFor(false, false)).toEqual({
			bounce: 0.3,
			durationS: 0.5,
			kind: "spring",
		});
		expect(rollFor(true, false)).toEqual({ durationS: 0.42, kind: "ease-out" });
		expect(rollFor(true, true)).toEqual({ kind: "none" });
		expect(rollFor(false, true)).toEqual({ kind: "none" });
	});
});
