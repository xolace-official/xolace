import { describe, expect, it } from "vitest";
import { headMotion } from "./face-motion";

const STILL = { lean: 0, restless: 0, squash: 0, tilt: 0 };

describe("headMotion", () => {
	it("sits square at rest, at the top of a breath's cycle", () => {
		expect(headMotion(STILL, 0, 0, 0)).toEqual({
			drop: 0,
			lean: 0,
			roll: 0,
			scaleX: 1,
			scaleY: 1,
		});
	});

	it("drops on a nod, and lifts and stretches on a hop", () => {
		expect(headMotion(STILL, 0, 1, 0).drop).toBeGreaterThan(0);
		const hop = headMotion(STILL, 0, 0, 1);
		expect(hop.drop).toBeLessThan(0);
		expect(hop.scaleY).toBeGreaterThan(1);
	});

	it("leans, rolls and squashes with the pose", () => {
		const m = headMotion(
			{ lean: 1, restless: 0, squash: 1, tilt: -1 },
			0,
			0,
			0
		);
		expect(m.lean).toBeGreaterThan(0);
		expect(m.roll).toBeLessThan(0);
		expect(m.scaleX).toBeGreaterThan(1);
		expect(m.scaleY).toBeLessThan(1);
	});

	it("fidgets only when restless", () => {
		const t = 0.3;
		expect(headMotion(STILL, t, 0, 0).roll).toBe(0);
		expect(headMotion({ ...STILL, restless: 1 }, t, 0, 0).roll).not.toBe(0);
	});
});
