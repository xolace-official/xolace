import { describe, expect, it } from "vitest";
import { BURST, burstFromX, DOORS, doorsCopy, doorsLandMs } from "./hero-model";

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
