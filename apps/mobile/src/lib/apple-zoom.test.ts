import { describe, expect, it } from "vitest";
import { zoomSupported } from "./apple-zoom";

describe("zoomSupported", () => {
	it("zooms from iOS 18", () => {
		expect(zoomSupported("ios", "18.0")).toBe(true);
		expect(zoomSupported("ios", "26.5")).toBe(true);
	});

	it("doesn't zoom before iOS 18", () => {
		expect(zoomSupported("ios", "17.4")).toBe(false);
		expect(zoomSupported("ios", "16.4")).toBe(false);
	});

	it("doesn't zoom on Android or on an unreadable version", () => {
		expect(zoomSupported("android", 35)).toBe(false);
		expect(zoomSupported("ios", "")).toBe(false);
	});
});
