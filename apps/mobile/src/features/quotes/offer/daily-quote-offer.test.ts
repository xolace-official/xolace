import { describe, expect, it } from "vitest";
import {
	mayOfferDailyQuote,
	OFFER_SLOT,
	offerAnswer,
} from "@/features/quotes/offer/daily-quote-offer";

describe("mayOfferDailyQuote", () => {
	it("offers to someone who never chose, once per device", () => {
		expect(mayOfferDailyQuote({ chosen: false, seen: false })).toBe(true);
		expect(mayOfferDailyQuote({ chosen: false, seen: true })).toBe(false);
	});

	it("never offers once a choice is on the server, on or off", () => {
		expect(mayOfferDailyQuote({ chosen: true, seen: false })).toBe(false);
	});

	it("waits for preferences", () => {
		expect(mayOfferDailyQuote({ chosen: undefined, seen: false })).toBe(false);
	});
});

describe("offerAnswer", () => {
	it("turns it on at the time chosen", () => {
		expect(offerAnswer("evening")).toEqual({ enabled: true, slot: "evening" });
	});

	it("records Not now as off, so it isn't asked again", () => {
		expect(offerAnswer(null)).toEqual({ enabled: false, slot: OFFER_SLOT });
	});
});
