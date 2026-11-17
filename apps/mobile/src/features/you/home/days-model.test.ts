import { describe, expect, it } from "vitest";
import {
	cellState,
	graphRange,
	indexHistory,
	readout,
	todayIn,
	weekDays,
	weekOf,
} from "@/features/you/home/days-model";
import { FIXTURE_TODAY, fixtureHistory } from "@/features/you/home/dev/history";

const regular = indexHistory(fixtureHistory("regular"), FIXTURE_TODAY);

describe("weekOf", () => {
	it("runs Monday to Sunday round today", () => {
		expect(weekOf("2026-11-12")).toEqual([
			"2026-11-09",
			"2026-11-10",
			"2026-11-11",
			"2026-11-12",
			"2026-11-13",
			"2026-11-14",
			"2026-11-15",
		]);
	});

	it("keeps a Sunday in the week that ends on it", () => {
		expect(weekOf("2026-11-15")[0]).toBe("2026-11-09");
	});
});

describe("graphRange", () => {
	it("draws 16 weeks from a new user's join week, Monday to Sunday", () => {
		const { start, end } = graphRange("2026-11-12", "2026-11-12");
		expect(start.getDay()).toBe(4);
		expect(end.getDay()).toBe(0);
		// The join week's Monday, 9 Nov, plus 16 weeks less a day: Sunday 28 February.
		expect(end).toEqual(new Date(2027, 1, 28));
	});

	it("ends on today's week once the history is longer", () => {
		const { end } = graphRange("2026-01-05", "2026-11-12");
		expect(end).toEqual(new Date(2026, 10, 15));
	});
});

describe("the board's history", () => {
	it("matches the board's week: Wednesday frozen, today lit, the rest ahead", () => {
		expect(weekDays(regular).map((d) => d.state)).toEqual([
			"lit",
			"lit",
			"frozen",
			"lit",
			"future",
			"future",
			"future",
		]);
		expect(weekDays(regular).find((d) => d.today)?.dayKey).toBe("2026-11-12");
		expect(
			weekDays(regular)
				.map((d) => d.letter)
				.join("")
		).toBe("MTWTFSS");
	});

	it("keeps frozen days out of the count", () => {
		expect(cellState("2026-09-26", regular)).toBe("frozen");
		expect(regular.daysShowedUp).toBe(fixtureHistory("regular").days.length);
	});
});

describe("readout", () => {
	it("counts the days at rest", () => {
		const one = { ...regular, daysShowedUp: 1 };
		expect(readout(null, one)).toEqual({ value: "1 day showed up" });
	});

	it("says what a held day was", () => {
		expect(readout("2026-09-26", regular).caption).toBe(
			"A freeze kept your streak lit"
		);
		expect(readout("2026-11-14", regular).caption).toBe("Still ahead");
		expect(readout("2026-08-15", regular).caption).toBe("A quiet day");
		const lit = readout("2026-11-12", regular).caption ?? "";
		expect(lit.length).toBeGreaterThan(0);
	});

	it("says nothing yet about an empty today", () => {
		const fresh = indexHistory(fixtureHistory("new"), FIXTURE_TODAY);
		expect(readout(FIXTURE_TODAY, fresh).caption).toBe("Nothing yet today");
	});
});

describe("todayIn", () => {
	it("keys today in the stored zone, falling back to UTC", () => {
		const noonUtc = Date.UTC(2026, 10, 12, 12);
		expect(todayIn("Pacific/Kiritimati", noonUtc)).toBe("2026-11-13");
		expect(todayIn("Not/AZone", noonUtc)).toBe("2026-11-12");
	});
});
