import { describe, expect, it } from "vitest";
import { nextWakeHour, phaseForHour, todayPhase } from "@/lib/day-phase";

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

describe("todayPhase", () => {
	it("is late whenever night mode has the night", () => {
		expect(todayPhase(23, true)).toBe("late");
	});

	it("keeps the late hours as evening when night mode is off", () => {
		expect(todayPhase(23, false)).toBe("evening");
		expect(todayPhase(2, false)).toBe("evening");
	});

	it("follows the hour by day", () => {
		expect(todayPhase(10, false)).toBe("day");
	});
});

describe("nextWakeHour", () => {
	it("is the next phase boundary", () => {
		expect(nextWakeHour(5)).toBe(9);
		expect(nextWakeHour(9)).toBe(17);
		expect(nextWakeHour(20)).toBe(22);
		expect(nextWakeHour(1)).toBe(4);
	});

	it("wakes at midnight after late begins, for the weekday", () => {
		expect(nextWakeHour(22)).toBe(24);
		expect(nextWakeHour(23)).toBe(24);
	});
});
