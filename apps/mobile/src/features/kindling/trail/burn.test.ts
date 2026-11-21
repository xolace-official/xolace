import { describe, expect, it } from "vitest";
import {
	arrivalOf,
	BURN_AT,
	type BurnTrail,
	burnU,
	END,
	goldEnd,
	legBurning,
	lifeOf,
	maxBurns,
	planBurn,
	planCatch,
	sparkAt,
	sparkLevel,
} from "./burn";
import { sampleLeg } from "./leg-samples";
import { RADIUS, trailPoints } from "./trail-points";

const points = trailPoints(4);
const trail: BurnTrail = {
	flame: points.flame,
	runs: points.legs.map((leg, j) =>
		sampleLeg(leg, points.stops[j] ?? leg[0], points.stops[j + 1] ?? null)
	),
	stops: points.stops,
};

describe("planBurn", () => {
	it("burns a leg in 1.2–1.7 s and lands on the next stop", () => {
		const b = planBurn(trail, 0, 0, false);
		expect(b.d).toBeGreaterThanOrEqual(1.2);
		expect(b.d).toBeLessThanOrEqual(1.7);
		expect(b.end).toBe(END.stop);
		expect(b.ride).toEqual([]);
		expect(arrivalOf(b)).toBeCloseTo(BURN_AT + b.d);
	});

	it("rides on into the fire when nothing is left waiting", () => {
		const b = planBurn(trail, 1, 0, true);
		expect(b.end).toBe(END.catch);
		expect(b.ride).toEqual([2, 3]);
		expect(arrivalOf(b)).toBeGreaterThan(BURN_AT + b.d);
		const [x, y] = sparkAt(trail, b, arrivalOf(b));
		expect(x).toBeCloseTo(points.legs[3]?.[3][0] ?? 0, 0);
		expect(y).toBeCloseTo(points.legs[3]?.[3][1] ?? 0, 0);
	});

	it("lands the last stop's spark in the fire without catching", () => {
		expect(planBurn(trail, 3, 0, false).end).toBe(END.fire);
	});

	it("catches in place with no run", () => {
		const b = planCatch(5);
		expect(arrivalOf(b)).toBe(0);
		expect(sparkLevel(trail, b, 0.2)).toBe(0);
		expect(lifeOf(b)).toBeGreaterThan(0);
	});
});

describe("the burn on its leg", () => {
	const b = planBurn(trail, 0, 10, false);
	const run = trail.runs[0];
	const burnt = 10 + BURN_AT + b.d + 0.01;

	it("runs the gold from the disc's edge to the next, then hands over", () => {
		if (!run) {
			throw new Error("no run");
		}
		expect(burnU(trail, b, 0)).toBe(run.u0);
		const mid = burnU(trail, b, BURN_AT + b.d / 2);
		expect(mid).toBeGreaterThan(run.u0);
		expect(mid).toBeLessThan(run.u1);
		expect(burnU(trail, b, BURN_AT + b.d)).toBe(-1);
		expect(goldEnd(trail, [b], 1, 0, burnt)).toBe(1);
		expect(goldEnd(trail, [b], 1, 0, 10)).toBe(run.u0);
		expect(goldEnd(trail, [b], 0, 1, 10)).toBe(0);
	});

	it("keeps the dashes ahead of the spark while it burns", () => {
		expect(legBurning([b], 0, 10.5)).toBe(true);
		expect(legBurning([b], 0, burnt)).toBe(false);
		expect(legBurning([b], 1, 10.5)).toBe(false);
	});

	it("hides the spark under a disc and shows it on the road", () => {
		const mid = BURN_AT + b.d / 2;
		const [x, y] = sparkAt(trail, b, mid);
		const near = Math.min(
			...trail.stops.map(([cx, cy]) => Math.hypot(x - cx, y - cy))
		);
		expect(near).toBeGreaterThan(RADIUS);
		expect(sparkLevel(trail, b, mid)).toBeCloseTo(1);
		expect(sparkLevel(trail, b, arrivalOf(b) + 0.2)).toBe(0);
	});
});

describe("spark slots", () => {
	it("four tends on return and a catch in place each get a glow", () => {
		expect(maxBurns(4)).toBe(5);
	});
});
