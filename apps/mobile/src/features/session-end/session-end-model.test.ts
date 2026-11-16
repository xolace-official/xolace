import { describe, expect, it } from "vitest";
import {
	PLUS_OFFER_COOLDOWN_MS,
	PLUS_OFFER_FULL_STOP_MS,
} from "@/features/purchases/plus-offer-policy";
import { FREE, LISTEN, LISTENER, LOADING, STATE } from "./dev/fixtures";
import {
	ctaLabel,
	dayOf,
	fromOf,
	type NextInput,
	nextKey,
	type PitchContext,
	pathOf,
	pitchAllowed,
	savedMood,
	wordsToShare,
} from "./session-end-model";

const DAY = { late: false, step: 2 };
const input = (
	slot: Omit<NextInput, "late" | "step">,
	extra: Partial<NextInput> = {}
): NextInput => ({ ...slot, ...DAY, ...extra });

describe("pathOf and fromOf", () => {
	it("reads the route's path, the mirror's exit by default", () => {
		expect(pathOf("solo")).toBe("solo");
		expect(pathOf("peers")).toBe("peers");
		expect(pathOf(undefined)).toBe("exit");
		expect(pathOf("anything")).toBe("exit");
	});

	it("gives Sit and You're not alone their own line, the exit none", () => {
		expect(fromOf("solo")).toBe("sit");
		expect(fromOf("peers")).toBe("peers");
		expect(fromOf("exit")).toBeNull();
	});
});

describe("wordsToShare", () => {
	it("offers the distilled words after a path", () => {
		expect(wordsToShare("peers", " Tired. ")).toBe("Tired.");
	});

	it("offers nothing after the exit, or with no words", () => {
		expect(wordsToShare("exit", "Tired.")).toBeNull();
		expect(wordsToShare("solo", null)).toBeNull();
		expect(wordsToShare("solo", "  ")).toBeNull();
	});
});

describe("savedMood", () => {
	it("saves the word and where the thumb was", () => {
		expect(savedMood({ position: 0.2, step: -3, unsure: false })).toEqual({
			moodPosition: 0.2,
			postSessionMood: "heavier",
		});
		expect(savedMood({ position: 0.5, step: 0, unsure: false })).toEqual({
			moodPosition: 0.5,
			postSessionMood: "same",
		});
	});

	it("saves 'not sure' with no position, and nothing when skipped", () => {
		expect(savedMood({ position: 0.5, step: null, unsure: true })).toEqual({
			postSessionMood: "unsure",
		});
		expect(savedMood({ position: 0.5, step: null, unsure: false })).toBeNull();
	});
});

describe("dayOf", () => {
	it("rolls from yesterday's count when today just counted", () => {
		expect(dayOf(13, false)).toEqual({ from: 12, to: 13 });
	});

	it("holds still when today had counted, or nobody knows", () => {
		expect(dayOf(13, true)).toEqual({ from: 13, to: 13 });
		expect(dayOf(13, null)).toEqual({ from: 13, to: 13 });
		expect(dayOf(0, null)).toEqual({ from: 1, to: 1 });
	});
});

describe("ctaLabel", () => {
	it("is Skip until answered, then Continue, then I'm done", () => {
		const base = { late: false, moment: 1 as const, step: null, unsure: false };
		expect(ctaLabel(base)).toBe(0);
		expect(ctaLabel({ ...base, step: -2 })).toBe(1);
		expect(ctaLabel({ ...base, unsure: true })).toBe(1);
		expect(ctaLabel({ ...base, late: true })).toBe(1);
		expect(ctaLabel({ ...base, moment: 2 })).toBe(2);
	});
});

describe("nextKey", () => {
	it("holds the slot while a listener match or the plan is pending", () => {
		expect(nextKey(input(LOADING.slot))).toBe("loading");
		expect(nextKey(input({ ...STATE.slot, qualifies: undefined }))).toBe(
			"loading"
		);
	});

	it("offers a matched listener first, to everyone", () => {
		expect(nextKey(input(LISTENER.slot))).toBe("listener");
		expect(nextKey(input({ ...LISTENER.slot, plus: false }))).toBe("listener");
	});

	it("gives Xolace+ its kindling, setting up until it lands", () => {
		expect(nextKey(input(STATE.slot))).toBe("kindling");
		expect(nextKey(input({ ...STATE.slot, kindlingReady: false }))).toBe(
			"kindlingSettingUp"
		);
	});

	it("gives Xolace+ something to listen to when the session isn't kindling's", () => {
		expect(nextKey(input(LISTEN.slot))).toBe("listen");
		expect(nextKey(input({ ...LISTEN.slot, listen: false }))).toBe("none");
	});

	it("pitches kindling to a free user once, on a steady day", () => {
		expect(nextKey(input(FREE.slot))).toBe("kfree");
	});

	it("never pitches late, after a heavier answer, or against the cadence", () => {
		expect(nextKey(input(FREE.slot, { late: true }))).toBe("none");
		expect(nextKey(input(FREE.slot, { step: -3 }))).toBe("none");
		expect(nextKey(input(FREE.slot, { step: -2 }))).toBe("kfree");
		expect(nextKey(input({ ...FREE.slot, pitchAllowed: false }))).toBe("none");
		expect(nextKey(input({ ...FREE.slot, qualifies: false }))).toBe("none");
	});
});

describe("pitchAllowed", () => {
	const NOW = 1_000_000_000_000;
	const quiet: PitchContext = {
		dismissalCount: 0,
		fullStopSince: null,
		lastDismissedAt: undefined,
		now: NOW,
		previousSessionId: "s1",
		safeguardActive: false,
		sessionId: "s2",
		shownSessionId: null,
	};

	it("allows the pitch by default", () => {
		expect(pitchAllowed(quiet)).toBe(true);
	});

	it("never sells during a safeguard", () => {
		expect(pitchAllowed({ ...quiet, safeguardActive: true })).toBe(false);
	});

	it("never shows two sessions running, but keeps this session's", () => {
		expect(pitchAllowed({ ...quiet, shownSessionId: "s1" })).toBe(false);
		expect(pitchAllowed({ ...quiet, shownSessionId: "s2" })).toBe(true);
	});

	it("rests a week after a dismissal, and a month after three", () => {
		const day = 24 * 60 * 60 * 1000;
		expect(pitchAllowed({ ...quiet, lastDismissedAt: NOW - day })).toBe(false);
		expect(
			pitchAllowed({ ...quiet, lastDismissedAt: NOW - PLUS_OFFER_COOLDOWN_MS })
		).toBe(true);
		const stopped = { ...quiet, dismissalCount: 3, fullStopSince: NOW - day };
		expect(pitchAllowed(stopped)).toBe(false);
		expect(
			pitchAllowed({ ...stopped, fullStopSince: NOW - PLUS_OFFER_FULL_STOP_MS })
		).toBe(true);
	});
});
