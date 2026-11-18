import { describe, expect, it } from "vitest";
import {
	headerCopy,
	introDue,
	localDay,
	nextPhaseHour,
	phaseForHour,
	streakStep,
	todayPhase,
} from "./today-model";

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

describe("nextPhaseHour", () => {
	it("is the next boundary", () => {
		expect(nextPhaseHour(5)).toBe(9);
		expect(nextPhaseHour(9)).toBe(17);
		expect(nextPhaseHour(20)).toBe(22);
	});

	it("wraps to dawn after late begins", () => {
		expect(nextPhaseHour(23)).toBe(4);
		expect(nextPhaseHour(1)).toBe(4);
	});
});

describe("headerCopy", () => {
	it("greets by name, with the weekday and the part of the day", () => {
		expect(headerCopy("evening", "Thursday", "Ama")).toEqual({
			eyebrow: "Thursday · evening",
			greeting: "Good evening, Ama",
		});
	});

	it("asks late", () => {
		expect(headerCopy("late", "Thursday", "Ama").greeting).toBe(
			"Still up, Ama?"
		);
	});

	it("drops the name when there is none, or only spaces", () => {
		expect(headerCopy("dawn", "Monday", null).greeting).toBe("Good morning");
		expect(headerCopy("late", "Monday", "  ").greeting).toBe("Still up?");
		expect(headerCopy("day", "Monday", undefined).eyebrow).toBe(
			"Monday · afternoon"
		);
	});
});

describe("introDue", () => {
	it("plays once a day", () => {
		expect(introDue(null, "2026-11-18")).toBe(true);
		expect(introDue("2026-11-17", "2026-11-18")).toBe(true);
		expect(introDue("2026-11-18", "2026-11-18")).toBe(false);
	});
});

describe("streakStep", () => {
	const DAY = "2026-11-18";

	it("only remembers the first streak it sees", () => {
		expect(streakStep(null, 12, DAY)).toEqual({
			ignite: false,
			next: { count: 12, day: DAY, ignitedDay: null },
		});
	});

	it("ignites when the streak grew", () => {
		const seen = { count: 12, day: "2026-11-17", ignitedDay: null };
		expect(streakStep(seen, 13, DAY)).toEqual({
			ignite: true,
			next: { count: 13, day: DAY, ignitedDay: DAY },
		});
	});

	it("ignites once a day", () => {
		const seen = { count: 13, day: DAY, ignitedDay: DAY };
		expect(streakStep(seen, 14, DAY).ignite).toBe(false);
	});

	it("never ignites for a streak that held or ended", () => {
		const seen = { count: 13, day: "2026-11-17", ignitedDay: null };
		expect(streakStep(seen, 13, DAY).ignite).toBe(false);
		expect(streakStep(seen, 0, DAY)).toEqual({
			ignite: false,
			next: { count: 0, day: DAY, ignitedDay: null },
		});
	});
});

describe("localDay", () => {
	it("is the device's date", () => {
		expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
	});
});
