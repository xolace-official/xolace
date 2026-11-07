import { describe, expect, it } from "vitest";
import {
	calendarDate,
	stepForError,
	stepForStatus,
} from "@/features/xolacer-chat/age-gate/age-gate-step";

describe("stepForStatus", () => {
	it("asks with no date of birth, refuses a declared minor, and lets an adult through", () => {
		expect(stepForStatus("unknown")).toBe("ask");
		expect(stepForStatus("13_17")).toBe("not_available");
		expect(stepForStatus("under_13")).toBe("under_13");
		expect(stepForStatus("adult")).toBeNull();
	});

	it("leaves it to the server while the status is still loading", () => {
		expect(stepForStatus(undefined)).toBeNull();
	});
});

describe("stepForError", () => {
	const convexError = (data: unknown) =>
		Object.assign(new Error("x"), { data });

	it("maps the server's age codes to the step that answers them", () => {
		expect(stepForError(convexError({ code: "age_required" }))).toBe("ask");
		expect(
			stepForError(convexError({ code: "age_restricted", status: "13_17" }))
		).toBe("not_available");
		expect(
			stepForError(convexError({ code: "age_restricted", status: "under_13" }))
		).toBe("under_13");
	});

	it("is null for any other failure", () => {
		expect(
			stepForError(convexError({ code: "pending_request_limit" }))
		).toBeNull();
		expect(stepForError(new Error("offline"))).toBeNull();
	});
});

describe("calendarDate", () => {
	it("is the picked day on the device's calendar, zero-padded", () => {
		// Local midnight: a UTC conversion would roll this back a day east of UTC.
		expect(calendarDate(new Date(1990, 0, 5))).toBe("1990-01-05");
		expect(calendarDate(new Date(2008, 10, 25, 23, 59))).toBe("2008-11-25");
	});
});
