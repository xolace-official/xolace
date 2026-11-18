import { describe, expect, it } from "vitest";
import { breathAt, PATTERNS, TOP } from "./breath";

describe("breathAt", () => {
	const sigh = PATTERNS.sigh;

	it("breathes in, holds a little more, then out, and starts the next inhale at once", () => {
		expect(breathAt(sigh, 2, 0).p).toBe(0);
		expect(breathAt(sigh, 2, 3999).p).toBeGreaterThan(0.99);
		const top = breathAt(sigh, 2, 4500);
		expect(top.kind).toBe(TOP);
		expect(top.p).toBe(1);
		expect(breathAt(sigh, 2, 13_000)).toMatchObject({ cycle: 1, step: 0 });
		expect(breathAt(sigh, 2, 26_000).done).toBe(true);
	});

	it("wobbles only inside the top, from 0 back to 0", () => {
		expect(breathAt(sigh, 1, 4000).wob).toBeCloseTo(0, 9);
		expect(Math.abs(breathAt(sigh, 1, 4500).wob)).toBeGreaterThan(3);
		expect(breathAt(sigh, 1, 4999.999).wob).toBeCloseTo(0, 2);
		expect(breathAt(sigh, 1, 2000).wob).toBe(0);
	});
});
