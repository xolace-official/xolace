import { describe, expect, it } from "vitest";
import { inWindow, tilePlays, tileWindow } from "./tile-window";

const ROW = { gap: 10, inset: 20, tile: 92, viewport: 386 };

describe("tileWindow", () => {
	it("lists the tiles in view at rest", () => {
		// 20, 122, 224, 326 start inside 386; 428 doesn't.
		expect(tileWindow(0, 6, ROW)).toBe("0-3");
	});

	it("drops a tile once it has fully scrolled off the left", () => {
		expect(tileWindow(111, 6, ROW)).toBe("0-4");
		expect(tileWindow(112, 6, ROW)).toBe("1-4");
	});

	it("is the same string while the same tiles stay in view", () => {
		expect(tileWindow(5, 6, ROW)).toBe(tileWindow(30, 6, ROW));
	});

	it("is empty for an empty row", () => {
		expect(tileWindow(0, 0, ROW)).toBe("");
		expect(inWindow("", 0)).toBe(false);
	});

	it("reads a window back", () => {
		expect(inWindow("1-4", 0)).toBe(false);
		expect(inWindow("1-4", 1)).toBe(true);
		expect(inWindow("1-4", 4)).toBe(true);
		expect(inWindow("1-4", 5)).toBe(false);
	});
});

describe("tilePlays", () => {
	const base = { chosen: false, inView: true, moving: true };

	it("plays every tile in view on iOS", () => {
		expect(tilePlays({ ...base, rule: "in-view" })).toBe(true);
	});

	it("plays only the chosen tile on Android", () => {
		expect(tilePlays({ ...base, rule: "chosen" })).toBe(false);
		expect(tilePlays({ ...base, chosen: true, rule: "chosen" })).toBe(true);
	});

	it("never plays off screen or while loops rest", () => {
		const chosen = { ...base, chosen: true };
		expect(tilePlays({ ...chosen, inView: false, rule: "in-view" })).toBe(
			false
		);
		expect(tilePlays({ ...chosen, moving: false, rule: "chosen" })).toBe(false);
	});
});
