import { describe, expect, it } from "vitest";
import { collapseForRange } from "@/features/you/home/header/header-collapse";

/** B17's xxxLarge case: docked at a 300 pt range, then the header grows by 95 pt. */
const OLD_RANGE = 300;
const NEW_RANGE = 395;

describe("collapseForRange", () => {
	it("docks a header that grew under a page scrolled past its new range", () => {
		expect(collapseForRange(600, NEW_RANGE)).toBe(NEW_RANGE);
	});

	it("follows the page when it sits inside the new range", () => {
		expect(collapseForRange(340, NEW_RANGE)).toBe(340);
	});

	it("stays docked when the header shrinks", () => {
		expect(collapseForRange(600, OLD_RANGE)).toBe(OLD_RANGE);
	});

	it("is open at the top and through iOS's top bounce", () => {
		expect(collapseForRange(0, NEW_RANGE)).toBe(0);
		expect(collapseForRange(-40, NEW_RANGE)).toBe(0);
	});

	it("never collapses a header with nothing to collapse", () => {
		expect(collapseForRange(600, 0)).toBe(0);
	});
});
