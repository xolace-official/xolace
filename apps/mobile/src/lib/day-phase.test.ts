import { describe, expect, it } from "vitest";
import { phaseForHour } from "@/lib/day-phase";

describe("phaseForHour (dawn 4–9, day 9–17, evening 17–22, late 22–4)", () => {
	it.each([
		[0, "late"],
		[3, "late"],
		[4, "dawn"],
		[8, "dawn"],
		[9, "day"],
		[16, "day"],
		[17, "evening"],
		[21, "evening"],
		[22, "late"],
		[23, "late"],
	] as const)("hour %i is %s", (hour, phase) => {
		expect(phaseForHour(hour)).toBe(phase);
	});
});
