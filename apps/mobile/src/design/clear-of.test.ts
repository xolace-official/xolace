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
		// A dark page stays dark, not grey.
		expect(clearOf("oklch(11% 0.015 350)")).toMatch(
			/^rgba\(\d{1,2},\d{1,2},\d{1,2},0\)$/
		);
	});
});
