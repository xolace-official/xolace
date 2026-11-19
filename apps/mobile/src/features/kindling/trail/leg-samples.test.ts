import { describe, expect, it } from "vitest";
import { LEG_SAMPLES, legAt, sampleLeg } from "./leg-samples";
import { RADIUS, trailPoints } from "./trail-points";

const board = trailPoints(4);

describe("sampleLeg", () => {
	const [first] = board.legs;
	const run = first
		? sampleLeg(first, board.stops[0] ?? [0, 0], board.stops[1] ?? null)
		: null;

	it("runs from one stop to the next", () => {
		if (!run) {
			throw new Error("no leg");
		}
		expect(run.xs).toHaveLength(LEG_SAMPLES);
		expect([run.xs[0], run.ys[0]]).toEqual([322, 56]);
		expect(run.xs.at(-1)).toBeCloseTo(68);
		expect(run.ys.at(-1)).toBeCloseTo(192);
	});

	it("is sampled evenly by length", () => {
		if (!run) {
			throw new Error("no leg");
		}
		const step = run.length / (LEG_SAMPLES - 1);
		for (const i of [1, 60, 120, 200]) {
			const d = Math.hypot(
				(run.xs[i] ?? 0) - (run.xs[i - 1] ?? 0),
				(run.ys[i] ?? 0) - (run.ys[i - 1] ?? 0)
			);
			expect(d).toBeCloseTo(step, 0);
		}
	});

	it("leaves and enters the discs just outside their edge", () => {
		if (!run) {
			throw new Error("no leg");
		}
		const [x0, y0] = legAt(run, run.u0);
		const [x1, y1] = legAt(run, run.u1);
		expect(Math.hypot(x0 - 322, y0 - 56)).toBeCloseTo(RADIUS + 2, 0);
		expect(Math.hypot(x1 - 68, y1 - 192)).toBeCloseTo(RADIUS + 2, 0);
	});

	it("points its normals up", () => {
		if (!run) {
			throw new Error("no leg");
		}
		for (const ny of run.ny) {
			expect(ny).toBeLessThanOrEqual(0);
		}
	});

	it("runs the fire leg all the way in", () => {
		const fire = board.legs.at(-1);
		if (!fire) {
			throw new Error("no fire leg");
		}
		expect(sampleLeg(fire, board.stops[3] ?? [0, 0], null).u1).toBe(1);
	});
});
