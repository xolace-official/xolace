import { describe, expect, it } from "vitest";
import { ageStatusOn, isDateOfBirth } from "./ageStatus";

describe("ageStatusOn", () => {
	it("is adult from the 18th birthday, not the day before", () => {
		expect(ageStatusOn("2008-06-15", "2026-06-14")).toBe("13_17");
		expect(ageStatusOn("2008-06-15", "2026-06-15")).toBe("adult");
		expect(ageStatusOn("2008-06-15", "2026-06-16")).toBe("adult");
	});

	it("is 13-17 from the 13th birthday, under 13 the day before", () => {
		expect(ageStatusOn("2013-11-04", "2026-11-03")).toBe("under_13");
		expect(ageStatusOn("2013-11-04", "2026-11-04")).toBe("13_17");
	});

	it("counts a 29 February birthday from 1 March in other years", () => {
		expect(ageStatusOn("2008-02-29", "2026-02-28")).toBe("13_17");
		expect(ageStatusOn("2008-02-29", "2026-03-01")).toBe("adult");
	});

	it("is unknown with no date of birth", () => {
		expect(ageStatusOn(undefined, "2026-11-04")).toBe("unknown");
	});
});

describe("isDateOfBirth", () => {
	const today = "2026-11-04";

	it("accepts a real calendar date up to today", () => {
		expect(isDateOfBirth("1990-01-31", today)).toBe(true);
		expect(isDateOfBirth("2024-02-29", today)).toBe(true);
		expect(isDateOfBirth(today, today)).toBe(true);
	});

	it("refuses dates that don't exist, aren't zero-padded, or are in the future", () => {
		expect(isDateOfBirth("2025-02-29", today)).toBe(false);
		expect(isDateOfBirth("1990-04-31", today)).toBe(false);
		expect(isDateOfBirth("1990-1-5", today)).toBe(false);
		expect(isDateOfBirth("1990-01-05T00:00", today)).toBe(false);
		expect(isDateOfBirth("2026-11-05", today)).toBe(false);
	});

	it("refuses anyone older than 120", () => {
		expect(isDateOfBirth("1905-11-05", today)).toBe(true);
		expect(isDateOfBirth("1905-11-04", today)).toBe(false);
	});
});
