import { describe, expect, it } from "vitest";
import { clearOf } from "@/design/clear-of";

describe("clearOf", () => {
	it("keeps the colour and drops the alpha", () => {
		expect(clearOf("#f7f5fb")).toBe("rgba(247,245,251,0)");
		expect(clearOf("rgba(226, 218, 246, 0.95)")).toBe("rgba(226,218,246,0)");
	});

	it("reads the themes' oklch values", () => {
		expect(clearOf("oklch(100% 0 0)")).toBe("rgba(255,255,255,0)");
		expect(clearOf("oklch(0% 0 0)")).toBe("rgba(0,0,0,0)");
		expect(clearOf("oklch(11% 0.015 350)")).toMatch(
			/^rgba\(\d{1,2},\d{1,2},\d{1,2},0\)$/
		);
	});

	it("keeps the colour at a given alpha", () => {
		expect(clearOf("#191524", 0.19)).toBe("rgba(25,21,36,0.19)");
		expect(clearOf("oklch(100% 0 0)", 0.63)).toBe("rgba(255,255,255,0.63)");
	});
});
