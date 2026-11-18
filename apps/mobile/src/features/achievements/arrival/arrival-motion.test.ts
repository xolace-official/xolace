import { describe, expect, it } from "vitest";
import {
	bandAt,
	busy,
	CLOCK_START,
	coinAt,
	freshEng,
	geoFor,
	HELD,
	LAND,
	LIFT,
	liftAt,
	PH,
	PIECES,
	SHIMMER_EVERY,
	T,
} from "@/features/achievements/arrival/arrival-motion";
import { startEng } from "@/features/achievements/arrival/arrival-start";

const geo = geoFor(390, 844, 54);

describe("the confetti (arrivals §2)", () => {
	it("is 26 burst pieces and a fall of 34, the same every time", () => {
		expect(PIECES.filter((p) => p.burst)).toHaveLength(26);
		expect(PIECES.filter((p) => !p.burst)).toHaveLength(34);
		expect(PIECES.map((p) => p.w)).toEqual(PIECES.map((p) => p.w));
	});

	it("throws some burst pieces in front of the badge, never the fall", () => {
		expect(PIECES.some((p) => p.burst && p.front)).toBe(true);
		expect(PIECES.some((p) => !p.burst && p.front)).toBe(false);
	});
});

describe("coinAt", () => {
	it("drops from above the screen, small", () => {
		const c = coinAt(freshEng(false, false), geo);
		expect(c.cy).toBeLessThan(0);
		expect(c.r).toBeCloseTo(HELD.r * 0.6);
	});

	it("is in place and full size once settled", () => {
		const e = startEng(false, false, { at: 5000 });
		const c = coinAt(e, geo);
		expect(c.cy).toBeCloseTo(geo.hy, 0);
		expect(c.r).toBeCloseTo(HELD.r, 0);
	});

	it("is in place at once under Reduce Motion", () => {
		const c = coinAt(freshEng(false, true), geo);
		expect(c.cy).toBe(geo.hy);
		expect(c.r).toBe(HELD.r);
	});
});

describe("bandAt", () => {
	it("crosses once as it lands, then every 6 s", () => {
		expect(bandAt(LAND - 1, false)).toBe(-1);
		expect(bandAt(LAND + 260, false)).toBeCloseTo(0.5);
		expect(bandAt(LAND + 2000, false)).toBe(-1);
		expect(bandAt(LAND + SHIMMER_EVERY, false)).toBe(0);
		expect(bandAt(LAND + 260, true)).toBe(-1);
	});
});

describe("liftAt", () => {
	it("lifts the milestone 48 pt over 1.9–2.4 s", () => {
		expect(liftAt(T.lift, false)).toBeCloseTo(0);
		expect(liftAt(T.lift + T.liftFor, false)).toBe(LIFT);
	});

	it("stays put when no card comes up under the line", () => {
		expect(liftAt(T.lift + T.liftFor, false, false)).toBe(0);
		expect(liftAt(T.lift + T.liftFor, true, false)).toBe(0);
	});
});

describe("busy: the clock stops when nothing moves (§6)", () => {
	it("runs through the milestone and stops after its last ember", () => {
		const e = freshEng(true, false);
		expect(busy(e)).toBe(true);
		e.now = CLOCK_START + 9000;
		expect(busy(e)).toBe(false);
	});

	it("stops a badge after the fall, sooner without it", () => {
		const e = startEng(false, false, { at: 8000 });
		expect(e.phase).toBe(PH.badge);
		expect(busy(e)).toBe(false);
		const next = startEng(false, false, { at: 2000, step: 1 });
		expect(next.rain).toBe(false);
		expect(busy(next)).toBe(true);
	});

	it("keeps running while a close fades", () => {
		const e = startEng(false, false, { at: 8000 });
		e.tc = e.now;
		expect(busy(e)).toBe(true);
	});
});
