import { describe, expect, it } from "vitest";
import {
  choosePlusOffer,
  PLUS_OFFER_COOLDOWN_MS,
  PLUS_OFFER_FULL_STOP_MS,
  plusOfferCandidates,
  type PlusOfferInput,
} from "./plus-offer-policy";

const NOW = 1_700_000_000_000;

const base = (over: Partial<PlusOfferInput> = {}): PlusOfferInput => ({
  candidates: [1],
  surface: "session_close",
  safeguardActive: false,
  now: NOW,
  ...over,
});

describe("choosePlusOffer", () => {
  it("offers the highest-ranked eligible moment", () => {
    expect(choosePlusOffer(base({ candidates: [3, 5] }))).toEqual({
      show: true,
      moment: 3,
      variant: "default",
    });
  });

  it("offers nothing when no moment is eligible right now", () => {
    expect(choosePlusOffer(base({ candidates: [] }))).toEqual({
      show: false,
      reason: "no_candidate",
    });
  });

  // The one rule that has no exception, including for a surface the user
  // tapped themselves.
  it("vetoes on an active safeguard flow regardless of every other input", () => {
    expect(
      choosePlusOffer(
        base({
          safeguardActive: true,
          userInitiated: true,
          registerComplaint: true,
          candidates: [1, 2, 3, 4, 5],
        }),
      ),
    ).toEqual({ show: false, reason: "safeguard" });
  });

  it("shows at most one offer per session", () => {
    expect(choosePlusOffer(base({ shownThisSession: true }))).toEqual({
      show: false,
      reason: "session_cap",
    });
  });

  it("never offers two sessions in a row", () => {
    expect(choosePlusOffer(base({ shownLastSession: true }))).toEqual({
      show: false,
      reason: "back_to_back",
    });
  });

  it("holds a dismissed surface for seven days, then offers it again", () => {
    const dismissed = {
      lastDismissedAt: { session_close: NOW - PLUS_OFFER_COOLDOWN_MS + 1 },
    };
    expect(choosePlusOffer(base(dismissed))).toEqual({
      show: false,
      reason: "cooldown",
    });
    expect(
      choosePlusOffer(
        base({ lastDismissedAt: { session_close: NOW - PLUS_OFFER_COOLDOWN_MS } }),
      ),
    ).toEqual({ show: true, moment: 1, variant: "default" });
  });

  // The cooldown belongs to the slot, not the moment that happened to win it.
  // Rotating to the next-ranked moment in the same place is the same ask again.
  it("silences every moment at a dismissed surface, not just the one dismissed", () => {
    expect(
      choosePlusOffer(
        base({ candidates: [1, 4, 5], lastDismissedAt: { session_close: NOW } }),
      ),
    ).toEqual({ show: false, reason: "cooldown" });
  });

  // Per-surface, not global: a week of silence on the close slot says nothing
  // about the profile.
  it("still offers at another surface while one is cooling down", () => {
    expect(
      choosePlusOffer(
        base({
          surface: "profile_insight",
          candidates: [3],
          lastDismissedAt: { session_close: NOW },
        }),
      ),
    ).toEqual({ show: true, moment: 3, variant: "default" });
  });

  it("stops every surface for thirty days after three lifetime dismissals", () => {
    expect(
      choosePlusOffer(
        base({ candidates: [1, 2, 3], dismissalCount: 3, fullStopSince: NOW }),
      ),
    ).toEqual({ show: false, reason: "full_stop" });
  });

  it("lifts the full stop once the thirty days are up", () => {
    expect(
      choosePlusOffer(
        base({ dismissalCount: 3, fullStopSince: NOW - PLUS_OFFER_FULL_STOP_MS }),
      ),
    ).toEqual({ show: true, moment: 1, variant: "default" });
  });

  // "No stop recorded" must read as not stopped, not as a stop that started at
  // the epoch and never ends — a caller that persists the count without the
  // timestamp would otherwise silently suppress every offer forever.
  it("treats a missing full-stop timestamp as no stop at all", () => {
    expect(
      choosePlusOffer(base({ dismissalCount: 5, fullStopSince: null })),
    ).toEqual({ show: true, moment: 1, variant: "default" });
  });

  it("does not stop before the third dismissal", () => {
    expect(choosePlusOffer(base({ dismissalCount: 2, fullStopSince: NOW }))).toEqual({
      show: true,
      moment: 1,
      variant: "default",
    });
  });

  // If they tapped the locked thing, they asked — cadence governs what the app
  // says unprompted, not what the user opens.
  it("lets a user-initiated surface through every cadence and cooldown check", () => {
    expect(
      choosePlusOffer(
        base({
          userInitiated: true,
          candidates: [],
          shownThisSession: true,
          shownLastSession: true,
          dismissalCount: 9,
          fullStopSince: NOW,
          lastDismissedAt: { session_close: NOW },
        }),
      ),
    ).toEqual({ show: true, moment: null, variant: "default" });
  });

  it("swaps the copy variant on the register flag without changing what fires", () => {
    expect(choosePlusOffer(base({ registerComplaint: true }))).toEqual({
      show: true,
      moment: 1,
      variant: "register",
    });
  });

  it("never fires a moment on the register flag alone", () => {
    expect(
      choosePlusOffer(base({ registerComplaint: true, candidates: [] })),
    ).toEqual({ show: false, reason: "no_candidate" });
    expect(
      choosePlusOffer(base({ registerComplaint: true, shownThisSession: true })),
    ).toEqual({ show: false, reason: "session_cap" });
  });
});

describe("plusOfferCandidates", () => {
  it("keeps the session-end slot's moments in rank order", () => {
    expect(
      plusOfferCandidates("session_close", { 1: true, 4: true, 5: true }),
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
