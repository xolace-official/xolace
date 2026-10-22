import { describe, expect, it } from "vitest";

import { cardFrame, cutoutPath, spotlightFor } from "./geometry";

const insets = { bottom: 34, left: 0, right: 0, top: 60 };
const screen = { screenHeight: 844, screenWidth: 390 };

describe("cutoutPath", () => {
	it("opens with the full-screen subpath so even-odd has something to cut from", () => {
		const d = cutoutPath(390, 844, 10, 20, 100, 40, 12);
		expect(d.startsWith("M0 0H390V844H0Z ")).toBe(true);
	});

	it("clamps the radius to half the shorter side, so a thin hole stays a hole", () => {
		// height 20 → max radius 10; asking for 999 must not invert the arcs.
		const d = cutoutPath(390, 844, 0, 0, 100, 20, 999);
		expect(d).toContain("A10 10");
		expect(d).not.toContain("A999");
	});
});

describe("spotlightFor", () => {
	it("grows a rect by the padding on every side", () => {
		const spot = spotlightFor(
			{ height: 40, width: 200, x: 50, y: 100 },
			"rect",
			8,
			12
		);
		expect(spot).toEqual({ height: 56, radius: 12, width: 216, x: 42, y: 92 });
	});

	it("squares a circle off the longer side and keeps the target centred", () => {
		const spot = spotlightFor(
			{ height: 20, width: 40, x: 50, y: 100 },
			"circle",
			6,
			12
		);
		expect(spot.width).toBe(spot.height);
		expect(spot.radius).toBe(spot.width / 2);
		expect(spot.x + spot.width / 2).toBe(70); // 50 + 40/2
		expect(spot.y + spot.height / 2).toBe(110); // 100 + 20/2
	});
});

describe("cardFrame", () => {
	it("centres the card when there is no target to sit beside", () => {
		const frame = cardFrame({
			cardHeight: 200,
			placement: "auto",
			spot: null,
			...screen,
			insets,
		});
		expect(frame.top).toBe((844 - 200) / 2);
	});

	it("sits below the target when below fits", () => {
		const frame = cardFrame({
			cardHeight: 160,
			placement: "auto",
			spot: { height: 50, width: 390, x: 0, y: 100 },
			...screen,
			insets,
		});
		expect(frame.top).toBe(100 + 50 + 12);
	});

	it("flips above when below would run off the bottom", () => {
		const frame = cardFrame({
			cardHeight: 160,
			placement: "auto",
			spot: { height: 60, width: 390, x: 0, y: 700 },
			...screen,
			insets,
		});
		expect(frame.top).toBe(700 - 12 - 160);
	});

	it("never places the card above the safe area, even when neither side fits", () => {
		const frame = cardFrame({
			cardHeight: 300,
			placement: "auto",
			spot: { height: 800, width: 390, x: 0, y: 0 },
			...screen,
			insets,
		});
		expect(frame.top).toBeGreaterThanOrEqual(insets.top + 16);
	});

	it("caps the width so the card does not run edge to edge on a tablet", () => {
		const frame = cardFrame({
			cardHeight: 100,
			insets,
			placement: "auto",
			screenHeight: 1366,
			screenWidth: 1024,
			spot: null,
		});
		expect(frame.width).toBe(420);
		expect(frame.left).toBe((1024 - 420) / 2);
	});
});
