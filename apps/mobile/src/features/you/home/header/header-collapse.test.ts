import { describe, expect, it } from "vitest";
import { nextCollapse } from "@/features/you/home/header/header-collapse";

const OLD_RANGE = 475;
const NEW_RANGE = 543;
const DEEP = 1111;

describe("nextCollapse", () => {
	it("docks a header that grew under a page scrolled past its new range", () => {
		expect(
			nextCollapse({ before: OLD_RANGE, offset: DEEP, range: NEW_RANGE })
		).toBe(NEW_RANGE);
	});

	it("follows the active tab's offset when it sits inside the new range", () => {
		expect(
			nextCollapse({ before: OLD_RANGE, offset: 500, range: NEW_RANGE })
		).toBe(500);
	});

	it("stays docked when the header shrinks", () => {
		expect(
			nextCollapse({ before: NEW_RANGE, offset: DEEP, range: OLD_RANGE })
		).toBe(OLD_RANGE);
	});

	it("leaves the collapse alone on the first run and when the range didn't change", () => {
		expect(nextCollapse({ before: null, offset: DEEP, range: 0 })).toBeNull();
		expect(
			nextCollapse({ before: NEW_RANGE, offset: DEEP, range: NEW_RANGE })
		).toBeNull();
	});

	it("opens the header when no tab has an offset yet, at the top and in iOS's top bounce", () => {
		expect(
			nextCollapse({ before: 0, offset: undefined, range: NEW_RANGE })
		).toBe(0);
		expect(nextCollapse({ before: 0, offset: 0, range: NEW_RANGE })).toBe(0);
		expect(
			nextCollapse({ before: OLD_RANGE, offset: -40, range: NEW_RANGE })
		).toBe(0);
	});

	it("never collapses a header with nothing to collapse", () => {
		expect(nextCollapse({ before: OLD_RANGE, offset: DEEP, range: 0 })).toBe(0);
	});
});
