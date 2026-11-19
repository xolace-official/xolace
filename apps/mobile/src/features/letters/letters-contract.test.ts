import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { FOR } from "./copy";
import {
	aimOf,
	isAgeRefusal,
	isLetterGone,
	lateCareDue,
	localDay,
	statusFrom,
} from "./letters-contract";

const SERVER = {
	invite: true,
	lastSentDay: null,
	lateRisk: null,
	optIn: "yes",
	unopenedId: null,
	writeLimit: null,
} as const;

describe("statusFrom", () => {
	it("keeps what the screens read, and drops what they don't", () => {
		expect(
			statusFrom({ ...SERVER, invite: false, lateRisk: "crisis" }, "2026-11-19")
		).toEqual({
			invite: false,
			optIn: "yes",
			unopenedId: null,
			writeLimit: null,
		});
	});

	it("keeps today's limit while it's still the day of the last letter", () => {
		const s = statusFrom(
			{ ...SERVER, lastSentDay: "2026-11-19", writeLimit: "today" },
			"2026-11-19"
		);
		expect(s.writeLimit).toBe("today");
	});

	it("lifts today's limit once the device's day has moved on", () => {
		const s = statusFrom(
			{ ...SERVER, lastSentDay: "2026-11-19", writeLimit: "today" },
			"2026-11-20"
		);
		expect(s.writeLimit).toBeNull();
	});

	it("never lifts three waiting on the day", () => {
		const s = statusFrom(
			{ ...SERVER, lastSentDay: "2026-11-18", writeLimit: "three" },
			"2026-11-20"
		);
		expect(s.writeLimit).toBe("three");
	});
});

describe("localDay", () => {
	it("is the device's calendar day, padded", () => {
		expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
	});
});

describe("aimOf", () => {
	it("sends no aim for Anyone", () => {
		expect(aimOf("Anyone")).toBeUndefined();
	});

	it("maps every other For to the contract's keys", () => {
		expect(FOR.filter((f) => f !== "Anyone").map(aimOf)).toEqual([
			"anxiety",
			"loneliness",
			"grief",
			"sleep",
			"low",
		]);
	});
});

describe("errors", () => {
	it("knows an age refusal from the server", () => {
		expect(isAgeRefusal(new ConvexError({ code: "age_required" }))).toBe(true);
		expect(
			isAgeRefusal(new ConvexError({ code: "age_restricted", status: "13_17" }))
		).toBe(true);
		expect(isAgeRefusal(new ConvexError({ code: "rate_limited" }))).toBe(false);
		expect(isAgeRefusal(new Error("offline"))).toBe(false);
	});

	it("knows a letter already gone", () => {
		expect(isLetterGone(new ConvexError({ code: "letter_not_found" }))).toBe(
			true
		);
		expect(isLetterGone(new Error("letter_not_found"))).toBe(false);
	});
});

describe("lateCareDue", () => {
	it("shows a late risk when the app opens", () => {
		expect(lateCareDue("elevated", true, null)).toBe("elevated");
		expect(lateCareDue("crisis", true, null)).toBe("crisis");
	});

	it("waits for the next open rather than rising over what someone is doing", () => {
		expect(lateCareDue("crisis", false, null)).toBeNull();
	});

	it("shows nothing while the status loads or there's nothing to show", () => {
		expect(lateCareDue(undefined, true, null)).toBeNull();
		expect(lateCareDue(null, true, null)).toBeNull();
	});

	it("never stacks a second care over one already up", () => {
		expect(lateCareDue("crisis", true, "elevated")).toBeNull();
	});
});
