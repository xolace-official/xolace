import { describe, expect, it } from "vitest";
import {
	DISMISS_DRAG,
	DISMISS_VELOCITY,
	sheetBottom,
	shouldDismiss,
} from "./sheet-drag";

describe("shouldDismiss", () => {
	it("closes past 120 pt or on a fast flick down, and settles back otherwise", () => {
		expect(shouldDismiss(DISMISS_DRAG + 1, 0)).toBe(true);
		expect(shouldDismiss(10, DISMISS_VELOCITY + 1)).toBe(true);
		expect(shouldDismiss(DISMISS_DRAG, DISMISS_VELOCITY)).toBe(false);
		expect(shouldDismiss(-40, -2000)).toBe(false);
	});
});

describe("sheetBottom", () => {
	it("floats over the home indicator, never closer than 10 pt to the edge", () => {
		expect(sheetBottom(34)).toBe(10);
		expect(sheetBottom(48)).toBe(24);
		expect(sheetBottom(0)).toBe(10);
	});
});
