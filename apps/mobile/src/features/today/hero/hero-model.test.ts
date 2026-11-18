import { describe, expect, it } from "vitest";
import {
	BURST,
	burstFromX,
	canChoose,
	canTap,
	DOORS,
	doorsCopy,
	doorsLandMs,
	HOLD_REST,
	type HoldEvent,
	holdNext,
} from "./hero-model";

const fromXs = (count: number) =>
	Array.from({ length: count }, (_, i) => burstFromX(i, count));

describe("the doors", () => {
	it("are Talk and Vent until Sit can start from Today", () => {
		expect(DOORS).toEqual(["talk", "vent"]);
	});

	it("burst from points centred on the hint line, 110 pt apart", () => {
		expect(fromXs(3)).toEqual([110, 0, -110]);
		expect(fromXs(2)).toEqual([55, -55]);
		expect(fromXs(1)).toEqual([0]);
	});

	it("land, and Bloom, when the last one finishes", () => {
		expect(doorsLandMs(3)).toBe(BURST.ms + 2 * BURST.stagger);
		expect(doorsLandMs(2)).toBe(BURST.ms + BURST.stagger);
	});

	it("name themselves in the hint and VoiceOver's copy", () => {
		expect(doorsCopy(["talk", "vent"])).toEqual({
			a11yHint: "Opens Reflect. Talk and Vent are in actions.",
			action: "Talk or Vent",
			hint: "Hold the card for Talk or Vent",
		});
		expect(doorsCopy(["talk", "vent", "sit"])).toEqual({
			a11yHint: "Opens Reflect. Talk, Vent and Sit with this are in actions.",
			action: "Talk, Vent or Sit with this",
			hint: "Hold the card for Talk, Vent or Sit with this",
		});
	});
});

const run = (events: HoldEvent[]) => events.reduce(holdNext, HOLD_REST);

describe("the hold", () => {
	it("opens the doors after a still hold", () => {
		const s = run([{ type: "in", x: 100, y: 100 }]);
		expect(s.phase).toBe("holding");
		expect(canChoose(s)).toBe(true);
		expect(holdNext(s, { type: "choose" }).phase).toBe("chosen");
	});

	it("keeps holding through a wobble inside the slop", () => {
		const s = run([
			{ type: "in", x: 100, y: 100 },
			{ type: "move", x: 106, y: 107 },
		]);
		expect(s.phase).toBe("holding");
		expect(canTap(s)).toBe(true);
	});

	it("drains on a drift past the slop, and opens neither the doors nor Reflect", () => {
		const s = run([
			{ type: "in", x: 100, y: 100 },
			{ type: "move", x: 100, y: 112 },
		]);
		expect(s.phase).toBe("drifted");
		expect(canChoose(s)).toBe(false);
		expect(canTap(s)).toBe(false);
		expect(holdNext(s, { type: "choose" }).phase).toBe("drifted");
		// Lifting the finger doesn't make the drift a tap; onPress may land after onPressOut.
		expect(canTap(holdNext(s, { type: "out" }))).toBe(false);
	});

	it("starts afresh on the next touch", () => {
		const s = run([
			{ type: "in", x: 100, y: 100 },
			{ type: "move", x: 140, y: 100 },
			{ type: "out" },
			{ type: "in", x: 50, y: 50 },
		]);
		expect(s).toEqual({ phase: "holding", x: 50, y: 50 });
	});

	it("lets a tap through after a still press", () => {
		expect(canTap(run([{ type: "in", x: 1, y: 1 }, { type: "out" }]))).toBe(
			true
		);
	});

	it("ignores touches while the doors are open, until Write instead", () => {
		const chosen = run([{ type: "in", x: 1, y: 1 }, { type: "choose" }]);
		expect(holdNext(chosen, { type: "in", x: 9, y: 9 })).toBe(chosen);
		expect(canTap(chosen)).toBe(false);
		expect(holdNext(chosen, { type: "unchoose" })).toEqual(HOLD_REST);
	});

	it("lets VoiceOver's action open the doors at rest", () => {
		expect(holdNext(HOLD_REST, { type: "choose" }).phase).toBe("chosen");
	});
});
