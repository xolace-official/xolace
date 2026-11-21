import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { FOR } from "./copy";
import {
	aimOf,
	isAgeRefusal,
	isLetterGone,
	isNoSession,
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

	it("knows a send refused before a first session", () => {
		expect(isNoSession(new ConvexError({ code: "no_session" }))).toBe(true);
		expect(isNoSession(new ConvexError({ code: "age_required" }))).toBe(false);
	});

	it("knows a letter already gone", () => {
		expect(isLetterGone(new ConvexError({ code: "letter_not_found" }))).toBe(
			true
		);
		expect(isLetterGone(new Error("letter_not_found"))).toBe(false);
	});
});

describe("lateCareDue", () => {
	const OPEN = {
		armed: true,
		covered: false,
		risk: "crisis",
		showing: null,
	} as const;

	it("shows a late risk when the app opens", () => {
		expect(lateCareDue({ ...OPEN, risk: "elevated" })).toBe("elevated");
		expect(lateCareDue(OPEN)).toBe("crisis");
	});

	it("waits for the next open rather than rising over what someone is doing", () => {
		expect(lateCareDue({ ...OPEN, armed: false })).toBeNull();
	});

	it("waits while Write or a natively presented screen covers the app", () => {
		expect(lateCareDue({ ...OPEN, covered: true })).toBeNull();
	});

	it("shows nothing while the status loads or there's nothing to show", () => {
		expect(lateCareDue({ ...OPEN, risk: undefined })).toBeNull();
		expect(lateCareDue({ ...OPEN, risk: null })).toBeNull();
	});

	it("never stacks a second care over one already up", () => {
		expect(lateCareDue({ ...OPEN, showing: "elevated" })).toBeNull();
	});
});
