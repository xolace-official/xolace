import { describe, expect, it, vi } from "vitest";
import { REDUCED_FADE_MS } from "@/design/springs";
import { cardStart } from "../arrival/arrival-time";
import { MARK_AT, STAR, T, TIMING } from "../peers-look";
import { blinkAt, pointAlpha, starAt, waveDelay } from "./mark-geo";

// Linear curves: these tests pin when each part moves, not the board's curves.
vi.mock("react-native-reanimated", async () => ({
	...(await import("@/design/testing/reanimated-stub")),
	Easing: {
		bezier: () => (t: number) => t,
		bezierFn: () => (t: number) => t,
	},
}));
vi.mock("@shopify/react-native-skia", () => {
	const builder = {
		build: () => ({}),
		moveTo: () => builder,
		quadTo: () => builder,
	};
	return { Skia: { PathBuilder: { Make: () => builder } } };
});

/** Star 1 (a tile circle) is card 0's; star 3 (an outer one) card 3's. */
const TILE = 1;
const OUTER = 3;

describe("starAt", () => {
	it("starts a tile star as a ring at the tile, moving to its place", () => {
		const at = starAt(cardStart(0), TILE, 4, false, false);
		expect(at).toMatchObject({ draw: 0, inA: 1, morph: 0, ring: 1 });
		expect([at.x, at.y]).toEqual(MARK_AT[TILE]);
		const there = starAt(cardStart(0) + TIMING.move, TILE, 4, false, false);
		expect([there.x, there.y]).toEqual(STAR[TILE]);
	});

	it("blooms an outer star .42 s after its line starts", () => {
		const s = cardStart(3);
		expect(starAt(s + TIMING.bloomAt, OUTER, 4, false, false)).toMatchObject({
			inA: 0,
			scale: 0.3,
		});
		expect(
			starAt(s + TIMING.bloomAt + TIMING.bloom, OUTER, 4, false, false)
		).toMatchObject({ inA: 1, scale: 1 });
	});

	it("leaves a star with no card unlit: the tile's ring stays", () => {
		const a = cardStart(3) + TIMING.draw;
		expect(starAt(a, OUTER, 2, false, false)).toMatchObject({
			draw: 0,
			inA: 0,
			ring: 0,
		});
		expect(starAt(a, TILE, 0, false, false)).toMatchObject({
			inA: 1,
			ring: 1,
		});
	});

	it("fades the tile's rings out with Done for None yet", () => {
		expect(starAt(T.first, TILE, 0, true, false).inA).toBe(1);
		expect(
			starAt(T.first + TIMING.bloomFade / 2, TILE, 0, true, false).inA
		).toBe(0.5);
		expect(starAt(T.first + TIMING.bloomFade, TILE, 0, true, false).inA).toBe(
			0
		);
	});

	it("reduced: no draw-on or move, a 200 ms fade in place from its card's turn", () => {
		const half = starAt(
			cardStart(0) + REDUCED_FADE_MS / 2,
			TILE,
			4,
			false,
			true
		);
		expect(half).toMatchObject({
			draw: 1,
			halo: 0.5,
			inA: 1,
			lineA: 0.5,
			morph: 0.5,
			ring: 0.5,
			scale: 1,
		});
		expect([half.x, half.y]).toEqual(STAR[TILE]);
		expect(
			starAt(cardStart(3) + REDUCED_FADE_MS, OUTER, 4, false, true)
		).toMatchObject({ inA: 1, lineA: 1, ring: 0 });
	});
});

describe("waveDelay (.6 s + distance / 240 pt/s)", () => {
	it("is the lead alone at the star you pressed", () => {
		expect(waveDelay(2, 2)).toBe(TIMING.blinkLead);
	});

	it("adds the travel time to farther stars", () => {
		const d = Math.hypot(STAR[3][0] - STAR[0][0], STAR[3][1] - STAR[0][1]);
		expect(waveDelay(0, 3)).toBeCloseTo(600 + (d / 240) * 1000);
		expect(waveDelay(0, 3)).toBe(waveDelay(3, 0));
	});
});

describe("blinkAt", () => {
	it("shows nothing before or after", () => {
		expect(blinkAt(0)).toEqual({ a: 0, s: 1 });
		expect(blinkAt(TIMING.blink)).toEqual({ a: 0, s: 1 });
	});

	it("peaks at a quarter: α .95, scale 1.25", () => {
		const at = blinkAt(TIMING.blink * 0.25);
		expect(at.a).toBeCloseTo(0.95);
		expect(at.s).toBeCloseTo(1.25);
	});

	it("grows from .6 and fades out to 1.6", () => {
		expect(blinkAt(TIMING.blink * 0.125).s).toBeCloseTo(0.925);
		const late = blinkAt(TIMING.blink * 0.625);
		expect(late.a).toBeCloseTo(0.475);
		expect(late.s).toBeCloseTo(1.425);
	});
});

describe("pointAlpha", () => {
	it("is clear at the ends", () => {
		expect(pointAlpha(0)).toBe(0);
		expect(pointAlpha(1)).toBe(0);
	});

	it("fades in over the first 12% and out over the last 15%", () => {
		expect(pointAlpha(0.06)).toBeCloseTo(0.5);
		expect(pointAlpha(0.5)).toBe(1);
		expect(pointAlpha(0.925)).toBeCloseTo(0.5);
	});
});
