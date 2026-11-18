import { describe, expect, it } from "vitest";
import {
	headerCopy,
	introDue,
	localDay,
	nextPhaseHour,
	nextStreakShown,
	parseIntroDay,
	parseSeenStreak,
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
			next: { count: 12, ignitedDay: null },
		});
	});

	it("ignites when the streak grew", () => {
		expect(streakStep({ count: 12, ignitedDay: null }, 13, DAY)).toEqual({
			ignite: true,
			next: { count: 13, ignitedDay: DAY },
		});
	});

	it("ignites once a day", () => {
		expect(streakStep({ count: 13, ignitedDay: DAY }, 14, DAY).ignite).toBe(
			false
		);
	});

	it("never ignites for a streak that held or ended", () => {
		const seen = { count: 13, ignitedDay: null };
		expect(streakStep(seen, 13, DAY).ignite).toBe(false);
		expect(streakStep(seen, 0, DAY)).toEqual({
			ignite: false,
			next: { count: 0, ignitedDay: null },
		});
	});
});

describe("nextStreakShown (the hook's order of updates)", () => {
	const DAY = "2026-11-18";

	it("waits while the profile loads", () => {
		expect(nextStreakShown(null, undefined, DAY, () => null)).toBeNull();
	});

	it("on a cold start, shows the kept 12 and the loaded 13 as one step that ignites", () => {
		const kept = { count: 12, ignitedDay: null };
		const step = nextStreakShown(null, 13, DAY, () => kept);
		expect(step?.shown).toEqual({ count: 13, day: DAY, igniteKey: 1 });
		expect(step?.keep).toEqual({ count: 13, ignitedDay: DAY });
	});

	it("changes the count and the key together while open", () => {
		const shown = { count: 12, day: DAY, igniteKey: 0 };
		const first = nextStreakShown(shown, 12, DAY, () => ({
			count: 12,
			ignitedDay: null,
		}));
		expect(first).toBeNull();
		const grown = nextStreakShown(shown, 13, DAY, () => ({
			count: 12,
			ignitedDay: null,
		}));
		expect(grown?.shown).toEqual({ count: 13, day: DAY, igniteKey: 1 });
	});

	it("doesn't ignite a second time that day", () => {
		const shown = { count: 13, day: DAY, igniteKey: 1 };
		const again = nextStreakShown(shown, 14, DAY, () => ({
			count: 13,
			ignitedDay: DAY,
		}));
		expect(again?.shown.igniteKey).toBe(1);
		expect(again?.shown.count).toBe(14);
	});
});

describe("device records are per user", () => {
	const A = "user_a";
	const B = "user_b";
	const seenA = JSON.stringify({ count: 3, ignitedDay: null, userId: A });

	it("reads this user's streak", () => {
		expect(parseSeenStreak(seenA, A)).toEqual({ count: 3, ignitedDay: null });
	});

	it("ignores another user's streak, so B's 30 doesn't ignite on A's 3", () => {
		expect(parseSeenStreak(seenA, B)).toBeNull();
	});

	it("ignores a record in the wrong shape, or none", () => {
		expect(
			parseSeenStreak(JSON.stringify({ count: "3", userId: A }), A)
		).toBeNull();
		expect(parseSeenStreak("not json", A)).toBeNull();
		expect(parseSeenStreak(null, A)).toBeNull();
		expect(
			parseSeenStreak(JSON.stringify({ count: 3, day: "x", userId: A }), A)
		).toBeNull();
	});

	it("reads the intro day for this user only", () => {
		const raw = JSON.stringify({ day: "2026-11-18", userId: A });
		expect(parseIntroDay(raw, A)).toBe("2026-11-18");
		expect(parseIntroDay(raw, B)).toBeNull();
		expect(parseIntroDay("2026-11-18", A)).toBeNull();
	});
});

describe("localDay", () => {
	it("is the device's date", () => {
		expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
	});
});
