import { describe, expect, it } from "vitest";
import {
	choosePlusOffer,
	PLUS_OFFER_COOLDOWN_MS,
	PLUS_OFFER_FULL_STOP_MS,
	type PlusOfferInput,
	plusOfferCandidates,
} from "./plus-offer-policy";

const NOW = 1_700_000_000_000;

const base = (over: Partial<PlusOfferInput> = {}): PlusOfferInput => ({
	candidates: [1],
	now: NOW,
	safeguardActive: false,
	surface: "session_close",
	...over,
});

describe("choosePlusOffer", () => {
	it("offers the highest-ranked eligible moment", () => {
		expect(choosePlusOffer(base({ candidates: [3, 5] }))).toEqual({
			moment: 3,
			show: true,
			variant: "default",
		});
	});

	it("offers nothing when no moment is eligible right now", () => {
		expect(choosePlusOffer(base({ candidates: [] }))).toEqual({
			reason: "no_candidate",
			show: false,
		});
	});

	// The one rule that has no exception, including for a surface the user
	// tapped themselves.
	it("vetoes on an active safeguard flow regardless of every other input", () => {
		expect(
			choosePlusOffer(
				base({
					candidates: [1, 2, 3, 4, 5],
					registerComplaint: true,
					safeguardActive: true,
					userInitiated: true,
				})
			)
		).toEqual({ reason: "safeguard", show: false });
	});

	it("shows at most one offer per session", () => {
		expect(choosePlusOffer(base({ shownThisSession: true }))).toEqual({
			reason: "session_cap",
			show: false,
		});
	});

	it("never offers two sessions in a row", () => {
		expect(choosePlusOffer(base({ shownLastSession: true }))).toEqual({
			reason: "back_to_back",
			show: false,
		});
	});

	it("holds a dismissed surface for seven days, then offers it again", () => {
		const dismissed = {
			lastDismissedAt: { session_close: NOW - PLUS_OFFER_COOLDOWN_MS + 1 },
		};
		expect(choosePlusOffer(base(dismissed))).toEqual({
			reason: "cooldown",
			show: false,
		});
		expect(
			choosePlusOffer(
				base({
					lastDismissedAt: { session_close: NOW - PLUS_OFFER_COOLDOWN_MS },
				})
			)
		).toEqual({ moment: 1, show: true, variant: "default" });
	});

	// The cooldown belongs to the slot, not the moment that happened to win it.
	// Rotating to the next-ranked moment in the same place is the same ask again.
	it("silences every moment at a dismissed surface, not just the one dismissed", () => {
		expect(
			choosePlusOffer(
				base({ candidates: [1, 4, 5], lastDismissedAt: { session_close: NOW } })
			)
		).toEqual({ reason: "cooldown", show: false });
	});

	// Per-surface, not global: a week of silence on the close slot says nothing
	// about the profile.
	it("still offers at another surface while one is cooling down", () => {
		expect(
			choosePlusOffer(
				base({
					candidates: [3],
					lastDismissedAt: { session_close: NOW },
					surface: "profile_insight",
				})
			)
		).toEqual({ moment: 3, show: true, variant: "default" });
	});

	it("stops every surface for thirty days after three lifetime dismissals", () => {
		expect(
			choosePlusOffer(
				base({ candidates: [1, 2, 3], dismissalCount: 3, fullStopSince: NOW })
			)
		).toEqual({ reason: "full_stop", show: false });
	});

	it("lifts the full stop once the thirty days are up", () => {
		expect(
			choosePlusOffer(
				base({
					dismissalCount: 3,
					fullStopSince: NOW - PLUS_OFFER_FULL_STOP_MS,
				})
			)
		).toEqual({ moment: 1, show: true, variant: "default" });
	});

	// "No stop recorded" must read as not stopped, not as a stop that started at
	// the epoch and never ends — a caller that persists the count without the
	// timestamp would otherwise silently suppress every offer forever.
	it("treats a missing full-stop timestamp as no stop at all", () => {
		expect(
			choosePlusOffer(base({ dismissalCount: 5, fullStopSince: null }))
		).toEqual({ moment: 1, show: true, variant: "default" });
	});

	it("does not stop before the third dismissal", () => {
		expect(
			choosePlusOffer(base({ dismissalCount: 2, fullStopSince: NOW }))
		).toEqual({
			moment: 1,
			show: true,
			variant: "default",
		});
	});

	// If they tapped the locked thing, they asked — cadence governs what the app
	// says unprompted, not what the user opens.
	it("lets a user-initiated surface through every cadence and cooldown check", () => {
		expect(
			choosePlusOffer(
				base({
					candidates: [],
					dismissalCount: 9,
					fullStopSince: NOW,
					lastDismissedAt: { session_close: NOW },
					shownLastSession: true,
					shownThisSession: true,
					userInitiated: true,
				})
			)
		).toEqual({ moment: null, show: true, variant: "default" });
	});

	it("swaps the copy variant on the register flag without changing what fires", () => {
		expect(choosePlusOffer(base({ registerComplaint: true }))).toEqual({
			moment: 1,
			show: true,
			variant: "register",
		});
	});

	it("never fires a moment on the register flag alone", () => {
		expect(
			choosePlusOffer(base({ candidates: [], registerComplaint: true }))
		).toEqual({ reason: "no_candidate", show: false });
		expect(
			choosePlusOffer(base({ registerComplaint: true, shownThisSession: true }))
		).toEqual({ reason: "session_cap", show: false });
	});
});

describe("plusOfferCandidates", () => {
	it("keeps the session-end slot's moments in rank order", () => {
		expect(
			plusOfferCandidates("session_close", { 1: true, 4: true, 5: true })
		).toEqual([1, 4, 5]);
	});

	it("drops moments whose data condition does not hold", () => {
		expect(plusOfferCandidates("session_close", { 5: true })).toEqual([5]);
	});

	// A moment can only be raised where it belongs — moment 3 is a profile
	// moment, and passing it to the close slot must not smuggle it in.
	it("never raises a moment at a surface it does not belong to", () => {
		expect(plusOfferCandidates("session_close", { 3: true })).toEqual([]);
		expect(plusOfferCandidates("mirror_landed", { 2: true })).toEqual([2]);
		expect(plusOfferCandidates("profile_insight", { 3: true })).toEqual([3]);
	});
});
