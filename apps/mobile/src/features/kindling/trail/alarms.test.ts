import { describe, expect, it } from "vitest";
import { type Alarm, dueAt, NEVER, nextOf, withoutLeg } from "./alarms";
import { arrivalOf, lifeOf, planBurn, planCatch } from "./burn";

const noop = () => undefined;
const at = (t: number, leg?: number): Alarm => ({ at: t, leg, ring: noop });

describe("alarms on the trail clock", () => {
	const land = at(2.1, 1);
	const drop = at(3.1, 1);

	it("nothing rings before its time", () => {
		const r = dueAt([land, drop], 1);
		expect(r.due).toEqual([]);
		expect(r.next).toBe(2.1);
	});

	it("a clock stopped while away (blur, background) rings nothing, however long the wall clock runs", () => {
		const once = dueAt([land, drop], 1.9);
		const again = dueAt(once.rest, 1.9);
		expect(again.due).toEqual([]);
		expect(again.rest).toEqual([land, drop]);
	});

	it("rings on return, once the clock passes it, soonest first", () => {
		const r = dueAt([drop, land], 3.5);
		expect(r.due).toEqual([land, drop]);
		expect(r.rest).toEqual([]);
		expect(r.next).toBe(NEVER);
	});

	it("the soonest of what's left is next", () => {
		expect(nextOf([at(5), at(4), at(9)])).toBe(4);
		expect(nextOf([])).toBe(NEVER);
	});
});

describe("a refused tend mid-burn takes back what it still had to do", () => {
	const t = {
		flame: [0, 0] as const,
		runs: [],
		stops: [],
	};
	const two = planBurn(t, 2, 0, false);
	const three = planBurn(t, 3, 0.3, true);

	it("its burn goes; the other tend's stays", () => {
		expect(withoutLeg([two, three], 3)).toEqual([two]);
	});

	it("its arrival (and so the fire's catch) and its drop go; the embers' end stays", () => {
		const embers = at(9);
		const list = [
			at(arrivalOf(two), 2),
			at(arrivalOf(three), 3),
			at(lifeOf(three), 3),
			embers,
		];
		expect(withoutLeg(list, 3).map((a) => a.leg)).toEqual([2, undefined]);
	});

	it("a catch in place belongs to no stop's tend", () => {
		expect(withoutLeg([planCatch(0)], 3)).toHaveLength(1);
	});
});
