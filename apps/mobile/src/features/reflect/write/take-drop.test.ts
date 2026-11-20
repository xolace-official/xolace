import { describe, expect, it } from "vitest";
import {
	dropAt,
	firstTake,
	stepTake,
	type Take,
	type TakeInput,
} from "./take-drop";

const BEFORE = "I wrote this.";
const idle = (live: boolean): TakeInput => ({
	listening: false,
	live,
	takeN: 0,
	text: BEFORE,
});

function run(inputs: TakeInput[]): Take[] {
	const [first, ...rest] = inputs as [TakeInput, ...TakeInput[]];
	const takes = [firstTake(first)];
	for (const input of rest) {
		takes.push(stepTake(takes.at(-1) as Take, input));
	}
	return takes;
}

describe("an on-device take (free, or a Plus fallback)", () => {
	const live = true;
	const takes = run([
		idle(live),
		{ listening: true, live, takeN: 0, text: BEFORE },
		{ listening: true, live, takeN: 0, text: `${BEFORE} I feel` },
		{ listening: true, live, takeN: 0, text: `${BEFORE} I feel tired` },
		{ listening: false, live, takeN: 0, text: `${BEFORE} I feel tired` },
		{ listening: false, live, takeN: 1, text: `${BEFORE} I feel tired` },
	]);

	it("shows its partials as they stream in", () => {
		expect(dropAt(takes[2] as Take, `${BEFORE} I feel`)).toBe(-1);
		expect(dropAt(takes[3] as Take, `${BEFORE} I feel tired`)).toBe(-1);
	});

	it("doesn't drop the words again once it's kept", () => {
		const kept = takes.at(-1) as Take;
		expect(kept.dropping).toBe(false);
		expect(dropAt(kept, `${BEFORE} I feel tired`)).toBe(-1);
	});
});

describe("a Plus (Scribe) take", () => {
	const live = false;
	const said = `${BEFORE} I feel tired`;
	const takes = run([
		idle(live),
		{ listening: true, live, takeN: 0, text: BEFORE },
		{ listening: false, live, takeN: 0, text: BEFORE },
		{ listening: false, live, takeN: 1, text: said },
	]);

	it("holds what follows the written text while it listens", () => {
		expect(dropAt(takes[1] as Take, `${BEFORE} I`)).toBe(BEFORE.length + 1);
	});

	it("drops its transcript in as one block once kept", () => {
		const kept = takes.at(-1) as Take;
		expect(kept.dropping).toBe(true);
		expect(dropAt(kept, said)).toBe(BEFORE.length + 1);
	});

	it("keeps the take's kind when listening ends and the count moves together", () => {
		const together = run([
			idle(live),
			{ listening: true, live, takeN: 0, text: BEFORE },
			{ listening: false, live: true, takeN: 1, text: said },
		]).at(-1) as Take;
		expect(together.dropping).toBe(true);
	});
});

describe("stepTake", () => {
	it("returns the same take when nothing changed", () => {
		const take = firstTake(idle(true));
		expect(stepTake(take, { ...idle(true), text: "typed" })).toBe(take);
	});

	it("remembers the kind the take started with", () => {
		const takes = run([
			idle(false),
			{ listening: true, live: true, takeN: 0, text: BEFORE },
			{ listening: true, live: false, takeN: 0, text: `${BEFORE} hi` },
		]);
		expect(dropAt(takes.at(-1) as Take, `${BEFORE} hi`)).toBe(-1);
	});
});
