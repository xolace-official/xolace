import { describe, expect, it } from "vitest";
import { arcsAt, breathAt, PATTERNS, TOP } from "./breath";

/** The old `use-dual-breath-animation.ts`, transcribed: each value lerped rest → peak by p. */
function production(W: number, H: number, p: number) {
	const lerp = (a: number, b: number) => a + (b - a) * p;
	const topH = lerp(0.6 * H, 0.32 * H);
	const botH = lerp(0.2 * H, 0.54 * H);
	const pairStartY = (H - topH - 14 - botH) / 2;
	const topW = lerp(0.82 * W, 0.74 * W);
	const botW = lerp(0.74 * W, 0.86 * W);
	return {
		bot: {
			h: botH,
			r: lerp(40, 56),
			w: botW,
			x: (W - botW) / 2,
			y: pairStartY + topH + 14,
		},
		top: {
			h: topH,
			r: lerp(54, 40),
			w: topW,
			x: (W - topW) / 2,
			y: pairStartY,
		},
	};
}

describe("arcsAt", () => {
	it("is production's geometry at rest, half way and breathed in", () => {
		for (const W of [390, 402]) {
			for (const p of [0, 0.5, 1]) {
				const a = arcsAt(W, 480, p, 0);
				const want = production(W, 480, p);
				for (const k of ["x", "y", "w", "h", "r"] as const) {
					expect(a.top[k]).toBeCloseTo(want.top[k], 9);
					expect(a.bot[k]).toBeCloseTo(want.bot[k], 9);
				}
			}
		}
	});

	it("matches the board at rest (390 × 480)", () => {
		const a = arcsAt(390, 480, 0, 0);
		expect(a.top).toMatchObject({ h: 288, y: 41 });
		expect(a.top.x).toBeCloseTo(35.1, 9);
		expect(a.bot).toMatchObject({ h: 96, y: 343 });
		expect(a.bot.w).toBeCloseTo(288.6, 9);
		expect(a.seamY).toBe(336);
	});
});

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
