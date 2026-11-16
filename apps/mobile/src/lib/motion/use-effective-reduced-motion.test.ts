import { describe, expect, it, vi } from "vitest";
import {
	isReducedMotion,
	type MotionPreference,
	resolveMotionPreference,
} from "./use-effective-reduced-motion";

vi.mock("convex/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/helpers/hooks/use-accessability-info", () => ({
	useAccessibilityInfo: vi.fn(),
}));

/**
 * The redesign's motion helpers take `reduced` from this one resolver. The prototype read the
 * OS setting with a Review-menu override; production's in-app preference takes that place, so
 * a forced choice wins over the OS either way.
 */
describe("reduced motion: the in-app preference, then the OS", () => {
	const cases: [MotionPreference, boolean, boolean][] = [
		["system", false, false],
		["system", true, true],
		["reduced", false, true],
		["reduced", true, true],
		["full", false, false],
		["full", true, false],
	];
	for (const [preference, os, reduced] of cases) {
		it(`${preference} with the OS setting ${os ? "on" : "off"} → ${reduced ? "reduced" : "full"}`, () => {
			expect(isReducedMotion(preference, os)).toBe(reduced);
		});
	}

	it("reads the stored tri-state first, then the legacy boolean, else follows the OS", () => {
		expect(resolveMotionPreference("full", true)).toBe("full");
		expect(resolveMotionPreference(undefined, true)).toBe("reduced");
		expect(resolveMotionPreference(undefined, false)).toBe("system");
		expect(resolveMotionPreference(undefined, undefined)).toBe("system");
	});
});
