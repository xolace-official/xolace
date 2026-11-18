import { describe, expect, it } from "vitest";
import {
	artOf,
	familyOf,
	familyOfId,
	familyTokens,
	longDate,
	progressLabel,
	progressShare,
	shortDate,
	sparksLine,
} from "@/features/achievements/achievements-model";

const NOV_4 = Date.UTC(2026, 10, 4, 12);

describe("familyOf", () => {
	it("gives each category its colour (badges §1)", () => {
		expect(familyOf("streak")).toBe("night");
		expect(familyOf("showing_up")).toBe("dawn");
		expect(familyOf("exploring")).toBe("green");
		expect(familyOf("getting_started")).toBe("teal");
		expect(familyOf("understanding")).toBe("aurora");
	});
});

describe("familyOfId", () => {
	it("reads the category from the catalog's ids", () => {
		expect(familyOfId("streak-7")).toBe("night");
		expect(familyOfId("streak-365")).toBe("night");
		expect(familyOfId("showing-up-10")).toBe("dawn");
		expect(familyOfId("understanding-3")).toBe("aurora");
		expect(familyOfId("joined")).toBe("teal");
		expect(familyOfId("first-session")).toBe("teal");
	});

	it("files everything else under Exploring", () => {
		expect(familyOfId("first-quote")).toBe("green");
		expect(familyOfId("read-5")).toBe("green");
		expect(familyOfId("a-badge-from-next-year")).toBe("green");
	});
});

describe("familyTokens", () => {
	it("floods with the scheme's colour and glows the same in both", () => {
		expect(familyTokens("dawn", true)).toEqual({
			flood: "badge-dawn-dusk",
			glow: "badge-dawn-glow",
		});
		expect(familyTokens("dawn", false).flood).toBe("badge-dawn-day");
	});
});

describe("progress", () => {
	const p = { current: 12, target: 14, unit: "days in a row" };

	it("reads out as N of M and the unit", () => {
		expect(progressLabel(p)).toBe("12 of 14 days in a row");
	});

	it("is a share of the target, never past full", () => {
		expect(progressShare(p)).toBeCloseTo(12 / 14);
		expect(progressShare({ ...p, current: 20 })).toBe(1);
		expect(progressShare({ ...p, target: 0 })).toBe(0);
	});
});

describe("dates", () => {
	it("writes the page's long date and the back's short one", () => {
		expect(longDate(NOV_4, "en-GB")).toBe("4 November 2026");
		expect(shortDate(NOV_4, "en-GB")).toBe("4 Nov 2026");
	});
});

describe("sparksLine", () => {
	it("adds a plus once earned and agrees in number", () => {
		expect(sparksLine(25, true)).toBe("+25 sparks");
		expect(sparksLine(25, false)).toBe("25 sparks");
		expect(sparksLine(1, true)).toBe("+1 spark");
	});
});

describe("artOf", () => {
	it("keeps the fallback art unlit", () => {
		expect(
			artOf({ fallback: true, thumbhash: null, url: "https://art/x.webp" })
		).toEqual({ source: "https://art/x.webp", thumbhash: null, unlit: true });
	});
});
