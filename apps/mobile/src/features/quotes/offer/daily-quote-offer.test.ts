import { describe, expect, it } from "vitest";
import {
	mayOfferDailyQuote,
	OFFER_SLOT,
	type OfferTrigger,
	offerAnswer,
	offerRisesAfter,
} from "@/features/quotes/offer/daily-quote-offer";

const TRIGGERS: readonly OfferTrigger[] = ["resonate", "keep", "share"];
const fresh = { blocked: false, chosen: false, seen: false } as const;

describe("mayOfferDailyQuote", () => {
	it("offers to someone who never chose, once per device", () => {
		expect(mayOfferDailyQuote(fresh)).toBe(true);
		expect(mayOfferDailyQuote({ ...fresh, seen: true })).toBe(false);
	});

	it("never offers once a choice is on the server: the daily quote on, or Not now", () => {
		expect(mayOfferDailyQuote({ ...fresh, chosen: true })).toBe(false);
	});

	it("never offers when the phone has denied notifications", () => {
		expect(mayOfferDailyQuote({ ...fresh, blocked: true })).toBe(false);
	});

	it("waits for preferences and the permission check", () => {
		expect(mayOfferDailyQuote({ ...fresh, chosen: undefined })).toBe(false);
		expect(mayOfferDailyQuote({ ...fresh, blocked: undefined })).toBe(false);
	});
});

describe("offerRisesAfter", () => {
	it("rises on the first share, a beat after the sheet closes", () => {
		expect(offerRisesAfter("share", mayOfferDailyQuote(fresh))).toBeGreaterThan(
			0
		);
	});

	it("rises on whichever of resonate, keep or share comes first", () => {
		for (const trigger of TRIGGERS) {
			expect(
				offerRisesAfter(trigger, mayOfferDailyQuote(fresh))
			).not.toBeNull();
		}
	});

	it("no trigger raises it again once shown or answered", () => {
		for (const state of [
			{ ...fresh, seen: true },
			{ ...fresh, chosen: true },
		]) {
			for (const trigger of TRIGGERS) {
				expect(offerRisesAfter(trigger, mayOfferDailyQuote(state))).toBeNull();
			}
		}
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
