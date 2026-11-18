import { describe, expect, it } from "vitest";
import {
	ageX,
	cardLeft,
	DRIFT,
	darkOf,
	freshEng,
	leaveOf,
	N,
	type PEng,
	promiseSettled,
	step,
} from "./promise-scene";

const W = 390;
const CW = W * 0.55;
const FRAME = 16;

function promise(rm = false): PEng {
	const e = freshEng(CW, W, rm, -1);
	e.now = 1000;
	e.t0 = 1000;
	return e;
}

function run(e: PEng, ms: number) {
	for (let t = 0; t < ms; t += FRAME) {
		e.now += FRAME;
		step(e, FRAME);
	}
}

describe("the marquee", () => {
	it("drifts at production's 18 pt/s", () => {
		const e = promise();
		const from = e.off;
		run(e, 1000);
		expect(e.off - from).toBeCloseTo(DRIFT, 0);
	});

	it("stands still under Reduce Motion", () => {
		const e = promise(true);
		const from = e.off;
		run(e, 2000);
		expect(e.off).toBe(from);
	});

	it("eases a throw back to the drift", () => {
		const e = promise();
		e.v = 4000;
		run(e, 4000);
		expect(e.v).toBeCloseTo(DRIFT, 0);
	});

	it("keeps every card on the belt, wrapping round", () => {
		const e = promise();
		e.off = 12_345;
		for (let i = 0; i < N; i++) {
			const left = cardLeft(e, i, CW);
			expect(left).toBeGreaterThanOrEqual(-CW);
			expect(left).toBeLessThan((N - 1) * CW);
		}
	});
});

describe("the hand-off", () => {
	it("has not started before the button is let go", () => {
		const e = promise();
		expect(ageX(e)).toBe(-1);
		expect(leaveOf(e)).toBe(0);
		expect(darkOf(e)).toBe(0);
	});

	it("darkens the ground and lifts the words away", () => {
		const e = promise();
		e.tx = e.now;
		run(e, 700);
		expect(darkOf(e)).toBe(1);
		expect(leaveOf(e)).toBe(1);
	});

	it("is quicker under Reduce Motion", () => {
		const e = promise(true);
		e.tx = e.now;
		run(e, 300);
		expect(darkOf(e)).toBe(1);
	});
});

describe("settling under Reduce Motion", () => {
	it("settles after the opening, and a touch wakes it", () => {
		const e = promise(true);
		run(e, 2000);
		expect(promiseSettled(e)).toBe(false);
		run(e, 2000);
		expect(promiseSettled(e)).toBe(true);
		e.down = true;
		expect(promiseSettled(e)).toBe(false);
		e.down = false;
		e.tn = e.now;
		expect(promiseSettled(e)).toBe(false);
	});

	it("never settles with full motion", () => {
		const e = promise();
		run(e, 6000);
		expect(promiseSettled(e)).toBe(false);
	});
});
