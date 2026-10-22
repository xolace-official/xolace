import { describe, expect, it } from "vitest";
import {
	gapObservation,
	milestoneObservation,
	PLUS_OFFER_GAP_MS,
	patternObservation,
} from "./plusOfferObservations";

const DAY = 24 * 60 * 60 * 1000;

describe("gapObservation", () => {
	it("says nothing about a gap too short to be a return", () => {
		expect(gapObservation(PLUS_OFFER_GAP_MS - 1)).toBeNull();
	});

	it("names the gap in weeks, spelled out", () => {
		expect(gapObservation(21 * DAY)).toBe("Three weeks since the last one.");
	});

	it("switches to months once weeks stop being legible", () => {
		expect(gapObservation(62 * DAY)).toBe("Two months since the last one.");
	});

	it("never prints a numeral past the spelled range", () => {
		expect(gapObservation(500 * DAY)).toBe("Many months since the last one.");
	});
});

describe("milestoneObservation", () => {
	it("prefers the streak week over the session count", () => {
		expect(milestoneObservation({ sessionCount: 5, streak: 7 })).toBe(
			"Seven nights running."
		);
	});

	it("falls back to the fifth night", () => {
		expect(milestoneObservation({ sessionCount: 5, streak: 2 })).toBe(
			"Five nights now."
		);
	});

	it("stays quiet between milestones", () => {
		expect(milestoneObservation({ sessionCount: 6, streak: 3 })).toBeNull();
	});
});

describe("patternObservation", () => {
	it("needs the word to come back across three separate sessions", () => {
		expect(patternObservation([["stuck"], ["stuck"]])).toBeNull();
	});

	it("quotes the user's own recurring word with its true count", () => {
		expect(
			patternObservation([["Stuck", "work"], ["stuck"], [" stuck "]])
		).toBe('"stuck" came back three times this week.');
	});

	// One session saying it three times is emphasis, not a pattern.
	it("does not let a single session count itself three times", () => {
		expect(patternObservation([["stuck", "stuck", "stuck"]])).toBeNull();
	});
});
