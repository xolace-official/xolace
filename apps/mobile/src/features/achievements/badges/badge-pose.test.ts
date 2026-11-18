import { describe, expect, it } from "vitest";
import {
	beginClose,
	CLOSE_MS,
	type Engine,
	EV,
	FADE_MS,
	IDLE_MS,
	LAND_MS,
	poseAt,
	step,
	tapTurn,
} from "@/features/achievements/badges/badge-pose";
import { RV } from "@/features/achievements/coin/pose";
import { showsBack, TAU } from "@/features/achievements/motion-math";

const FRAME = 16;
const SLOT = { r: 42, x: 60, y: 300 };
const HELD = { r: 125, x: 195, y: 400 };

function engine(over: Partial<Engine> = {}): Engine {
	return {
		at: 0,
		back: false,
		backAt: 0,
		backFrom: 0,
		cp: null,
		dragging: false,
		dragY: 0,
		from: 0,
		held: HELD,
		landed: false,
		locked: false,
		mode: "launch",
		no: { s: 11.5 / 30, x: 60, y: 356 },
		now: 0,
		o: SLOT,
		phase: "open",
		rattleAt: -1,
		reduced: false,
		spin: 0,
		still: false,
		t0: 0,
		tc: 0,
		titleY: 134,
		to: 0,
		touchAt: 0,
		v: 0,
		...over,
	};
}

/** Steps the engine `ms` forward in frames, collecting its events. */
function run(e: Engine, ms: number) {
	const evs: number[] = [];
	let pose = poseAt(e, 0);
	for (let t = 0; t < ms; t += FRAME) {
		const r = step(e, FRAME);
		pose = r.pose;
		if (r.ev !== EV.none) {
			evs.push(r.ev);
		}
	}
	return { evs, pose };
}

describe("poseAt (badges §3, opening)", () => {
	it("starts in the slot with the list at rest", () => {
		const p = poseAt(engine(), 0);
		expect(p).toMatchObject({ cx: SLOT.x, cy: SLOT.y, r: SLOT.r, recede: 0 });
	});

	it("lands at the held spot, turned once, the list sunk back and the colour down", () => {
		const p = poseAt(engine(), 3000);
		expect(p.cx).toBeCloseTo(HELD.x, 0);
		expect(p.cy).toBeCloseTo(HELD.y, 0);
		expect(p.r).toBeCloseTo(HELD.r, 0);
		expect(p.spin).toBeCloseTo(TAU, 1);
		expect(p.recede).toBeCloseTo(1);
		expect(p.spread).toBeCloseTo(1);
		expect(p.dim).toBeCloseTo(0.62);
	});

	it("keeps a locked badge grey: no bloom, no band, no motes, the page nearly covered", () => {
		const p = poseAt(engine({ locked: true, mode: "rest" }), 3000);
		expect(p.bloom).toBe(0);
		expect(p.band).toBe(-1);
		expect(p.mt).toBe(-1);
		expect(p.dim).toBeCloseTo(0.94);
	});

	it("reveals the words in their order: the line before the hint", () => {
		const p = poseAt(engine(), 900);
		expect(p.rvA[RV.line]).toBe(1);
		expect(p.rvA[RV.hint]).toBe(0);
	});

	it("cross-fades in place under Reduce Motion", () => {
		const p = poseAt(engine({ mode: "rest", reduced: true }), FADE_MS / 2);
		expect(p.cx).toBe(HELD.x);
		expect(p.alpha).toBeCloseTo(0.5);
		expect(p.tiltX).toBe(0);
	});

	it("shrinks and fades the words as it's pulled down", () => {
		const p = poseAt(engine({ dragY: 150, mode: "rest" }), 3000);
		expect(p.r).toBeCloseTo(HELD.r * (1 - 0.3 * 0.5), 1);
		expect(p.rvA[RV.line]).toBe(0);
		expect(p.rvA[RV.chrome]).toBe(1);
	});
});

describe("step", () => {
	it("lands once, at 620 ms", () => {
		const e = engine();
		const { evs } = run(e, LAND_MS + 100);
		expect(evs).toEqual([EV.landed]);
	});

	it("goes idle 10 s after the last touch, so the clock can stop", () => {
		const e = engine();
		const { evs } = run(e, IDLE_MS + 500);
		expect(evs).toContain(EV.idle);
	});

	it("seats in the slot face-up after the close", () => {
		const e = engine();
		run(e, 2000);
		e.spin = TAU + 0.4;
		e.mode = "rest";
		beginClose(e);
		const { evs, pose } = run(e, CLOSE_MS + 100);
		expect(evs).toContain(EV.seated);
		expect(pose.cx).toBeCloseTo(SLOT.x, 0);
		expect(showsBack(pose.spin)).toBe(false);
	});
});

describe("tapTurn", () => {
	it("rattles a locked badge", () => {
		const e = engine({ locked: true, mode: "rest" });
		expect(tapTurn(e)).toBe("rattle");
		expect(e.rattleAt).toBe(0);
	});

	it("turns to the other face slowly, and faces when done", () => {
		const e = engine({ mode: "rest", spin: TAU });
		expect(tapTurn(e)).toBe("turning");
		const { evs } = run(e, 800);
		expect(evs).toContain(EV.faced);
		expect(showsBack(e.spin)).toBe(true);
	});

	it("turns at once under Reduce Motion", () => {
		const e = engine({ mode: "rest", reduced: true });
		expect(tapTurn(e)).toBe("faced");
		expect(e.spin).toBe(Math.PI);
	});
});
