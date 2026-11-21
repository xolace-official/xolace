import { describe, expect, it } from "vitest";
import { DESIGN_W, isRight, trailPoints } from "./trail-points";

describe("trailPoints", () => {
	it("matches the board for four twigs", () => {
		const p = trailPoints(4);
		expect(p.stops).toEqual([
			[322, 56],
			[68, 192],
			[322, 328],
			[68, 464],
		]);
		expect(p.fire.y).toBe(519);
		expect(p.drawH).toBe(820);
		expect(p.blockH).toBe(964);
		expect(p.legs).toHaveLength(4);
	});

	it("starts each leg at a stop and ends at the next", () => {
		const p = trailPoints(3);
		for (const [j, leg] of p.legs.slice(0, -1).entries()) {
			expect(leg[0]).toEqual(p.stops[j]);
			expect(leg[3]).toEqual(p.stops[j + 1]);
		}
	});

	it("mirrors the flame when the last stop is on the right", () => {
		const left = trailPoints(4);
		const right = trailPoints(3);
		expect(isRight(2)).toBe(true);
		expect(right.flame[0]).toBeCloseTo(DESIGN_W - left.flame[0]);
	});

	it("scales across the screen's width", () => {
		const wide = trailPoints(2, 2);
		expect(wide.stops[0]?.[0]).toBe(644);
		expect(wide.stops[0]?.[1]).toBe(56);
	});
});
