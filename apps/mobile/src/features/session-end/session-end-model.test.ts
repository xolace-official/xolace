import { describe, expect, it, vi } from "vitest";
import {
	PLUS_OFFER_COOLDOWN_MS,
	PLUS_OFFER_FULL_STOP_MS,
} from "@/features/purchases/plus-offer-policy";
import {
	FREE,
	LETTER_WAITING,
	LETTER_WRITE,
	LISTEN,
	LISTENER,
	LOADING,
	STATE,
	UNLOCK,
	UPSELL,
	XOLACER,
} from "./dev/fixtures";
import {
	continueStep,
	ctaLabel,
	dayOf,
	endLetterOffer,
	endSafeguard,
	fromOf,
	isPitch,
	keptAtMoment2,
	letterPassed,
	momentGate,
	type NextInput,
	nextKey,
	type PitchContext,
	pathOf,
	pitchAllowed,
	pitchDismissed,
	ratingsSignalsOf,
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

	it("stops holding after 2 s: an unknown answer counts as no", () => {
		const offline = { ...FREE.slot, qualifies: undefined, waitedOut: true };
		expect(nextKey(input(offline))).toBe("none");
		expect(
			nextKey(input({ ...STATE.slot, qualifies: undefined, waitedOut: true }))
		).toBe("none");
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

describe("nextKey with letters", () => {
	const READ = { waiting: true, write: true };
	const WRITE = { waiting: false, write: true };
	const NONE = { waiting: false, write: false };
	const PLUS_SETTING_UP = { ...STATE.slot, kindlingReady: false };

	it("holds the slot until letters answer, then 2 s at most", () => {
		expect(nextKey(input({ ...FREE.slot, letters: undefined }))).toBe(
			"loading"
		);
		expect(
			nextKey(input({ ...FREE.slot, letters: undefined, waitedOut: true }))
		).toBe("kfree");
	});

	it("puts a matched listener above both letter cards", () => {
		expect(nextKey(input({ ...LISTENER.slot, letters: READ }))).toBe(
			"listener"
		);
	});

	it("offers the waiting letter, then writing one, above the free pitch", () => {
		expect(nextKey(input(LETTER_WAITING.slot))).toBe("letterRead");
		expect(nextKey(input(LETTER_WRITE.slot))).toBe("letterWrite");
		expect(nextKey(input({ ...FREE.slot, letters: NONE }))).toBe("kfree");
	});

	it("puts a waiting letter above kindling, and kindling above writing one", () => {
		expect(nextKey(input({ ...STATE.slot, letters: READ }))).toBe("letterRead");
		expect(nextKey(input({ ...STATE.slot, letters: WRITE }))).toBe("kindling");
	});

	it("collides with kindling setting up as with kindling", () => {
		expect(nextKey(input({ ...PLUS_SETTING_UP, letters: READ }))).toBe(
			"letterRead"
		);
		expect(nextKey(input({ ...PLUS_SETTING_UP, letters: WRITE }))).toBe(
			"kindlingSettingUp"
		);
	});

	it("doesn't need the session to qualify, and doesn't wait on it past 2 s", () => {
		const free = { ...FREE.slot, letters: WRITE, qualifies: false };
		expect(nextKey(input(free))).toBe("letterWrite");
		const plus = { ...STATE.slot, letters: WRITE, qualifies: false };
		expect(nextKey(input({ ...plus, listen: true }))).toBe("letterWrite");
		const pending = { ...FREE.slot, letters: READ, qualifies: undefined };
		expect(nextKey(input(pending))).toBe("loading");
		expect(nextKey(input({ ...pending, waitedOut: true }))).toBe("letterRead");
	});

	it("never follows a heavier answer, no answer, or a late session", () => {
		for (const extra of [{ step: -1 }, { step: null }, { late: true }]) {
			expect(nextKey(input(LETTER_WAITING.slot, extra))).not.toMatch(/letter/);
			expect(nextKey(input(LETTER_WRITE.slot, extra))).not.toMatch(/letter/);
		}
		expect(nextKey(input(LETTER_WRITE.slot, { step: 0 }))).toBe("letterWrite");
		expect(nextKey(input(LETTER_WRITE.slot, { step: -1 }))).toBe("kfree");
	});

	it("offers the waiting letter on the same answer (step 0), not only a lighter one", () => {
		expect(nextKey(input(LETTER_WAITING.slot, { step: 0 }))).toBe("letterRead");
		expect(nextKey(input({ ...STATE.slot, letters: READ }, { step: 0 }))).toBe(
			"letterRead"
		);
	});

	it("gives a late Xolace+ session its kindling, not the waiting letter", () => {
		const plus = { ...STATE.slot, letters: READ };
		expect(nextKey(input(plus, { late: true }))).toBe("kindling");
		expect(
			nextKey(input({ ...plus, kindlingReady: false }, { late: true }))
		).toBe("kindlingSettingUp");
	});

	it("gives Xolace+ its kindling once 2 s pass with letters still unread", () => {
		const unread = { ...STATE.slot, letters: undefined };
		expect(nextKey(input(unread))).toBe("loading");
		expect(nextKey(input({ ...unread, waitedOut: true }))).toBe("kindling");
	});
});

describe("the letters' slot and the safeguard", () => {
	const READ = { waiting: true, write: true };
	const STEADY = { safeguardLevel: "gentle" as const };
	const offerWith = () => vi.fn((_safeguard: boolean) => READ);

	it("reaches Xolace+, whose offer context is null, off the session alone", () => {
		const offer = offerWith();
		const letters = endLetterOffer(STEADY, null, offer);
		expect(offer).toHaveBeenCalledWith(false);
		expect(nextKey(input({ ...STATE.slot, letters }))).toBe("letterRead");
	});

	it("mirrors offerContext's rule: an escalation, elevated or crisis", () => {
		expect(endSafeguard({ escalationTriggered: true }, null)).toBe(true);
		expect(endSafeguard({ safeguardLevel: "elevated" }, null)).toBe(true);
		expect(endSafeguard({ safeguardLevel: "crisis" }, null)).toBe(true);
		expect(endSafeguard({ safeguardLevel: "gentle" }, null)).toBe(false);
		expect(endSafeguard({ safeguardLevel: "none" }, null)).toBe(false);
		expect(endSafeguard({}, null)).toBe(false);
	});

	it("passes a Xolace+ safeguard to letters, so they can withhold both cards", () => {
		const offer = offerWith();
		endLetterOffer({ safeguardLevel: "crisis" }, null, offer);
		expect(offer).toHaveBeenCalledWith(true);
	});

	it("keeps a free user's offer context as well as the session", () => {
		const active = { safeguardActive: true };
		expect(endSafeguard(STEADY, active)).toBe(true);
		expect(endSafeguard(STEADY, { safeguardActive: false })).toBe(false);
	});

	it("holds the slot until both are read, and treats a missing session as a safeguard", () => {
		const offer = offerWith();
		expect(endLetterOffer(undefined, null, offer)).toBeUndefined();
		expect(endLetterOffer(STEADY, undefined, offer)).toBeUndefined();
		expect(offer).not.toHaveBeenCalled();
		expect(endSafeguard(null, null)).toBe(true);
	});
});

describe("letterPassed", () => {
	it("counts leaving with the write card shown and untaken", () => {
		expect(letterPassed("letterWrite", false)).toBe(true);
		expect(letterPassed("letterWrite", true)).toBe(false);
		expect(letterPassed("letterRead", false)).toBe(false);
		expect(letterPassed(null, false)).toBe(false);
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

describe("Continue", () => {
	const at = {
		asked: false,
		canAsk: true,
		late: false,
		moment: 1 as const,
		pending: false,
		step: -3,
	};

	it("asks the heavier follow-up once, from step −3 down", () => {
		expect(continueStep(at)).toBe("ask");
		expect(continueStep({ ...at, asked: true })).toBe("go");
		expect(continueStep({ ...at, step: -2 })).toBe("go");
		expect(continueStep({ ...at, canAsk: false })).toBe("go");
		expect(continueStep({ ...at, late: true })).toBe("go");
	});

	it("ignores a second tap while the follow-up is open or moment 2 is coming", () => {
		expect(continueStep({ ...at, pending: true })).toBe("ignore");
		expect(continueStep({ ...at, moment: 2 })).toBe("ignore");
	});

	it("moves to moment 2 once, however many callers ask", () => {
		const gate = momentGate();
		expect(gate.busy).toBe(false);
		gate.hold();
		expect(gate.busy).toBe(true);
		expect(gate.enter()).toBe(true);
		expect(gate.enter()).toBe(false);
		expect(continueStep({ ...at, pending: gate.busy })).toBe("ignore");
	});
});

describe("pitchDismissed", () => {
	it("counts leaving past an untaken pitch as a no, and nothing else", () => {
		expect(pitchDismissed("kfree", false)).toBe(true);
		expect(pitchDismissed("kfree", true)).toBe(false);
		expect(pitchDismissed("kindling", false)).toBe(false);
		expect(pitchDismissed(null, false)).toBe(false);
	});
});

describe("keptAtMoment2", () => {
	it("keeps what moment 2 opened on, whatever lands after", () => {
		expect(keptAtMoment2(null, 1, "words")).toBeNull();
		const opened = keptAtMoment2<string | null>(null, 2, null);
		expect(opened).toEqual({ value: null });
		expect(keptAtMoment2(opened, 2, "late words")).toBe(opened);
	});
});

describe("nextKey with C2's cards (session-end-extras.md)", () => {
	const READ = { waiting: true, write: true };
	const WRITE = { waiting: false, write: true };

	it("offers the Xolacer suggestion first, above the unlock", () => {
		expect(nextKey(input({ ...XOLACER.slot, unlock: true }))).toBe("listener");
	});

	it("puts the unlock after a waiting letter and above kindling and writing one", () => {
		expect(nextKey(input(UNLOCK.slot))).toBe("unlock");
		expect(nextKey(input({ ...UNLOCK.slot, letters: READ }))).toBe(
			"letterRead"
		);
		expect(nextKey(input({ ...UNLOCK.slot, letters: WRITE }))).toBe("unlock");
		expect(nextKey(input({ ...UNLOCK.slot, kindlingReady: false }))).toBe(
			"unlock"
		);
		expect(nextKey(input({ ...UPSELL.slot, unlock: true }))).toBe("unlock");
	});

	it("shows the unlock only on a steady session, every plan", () => {
		expect(nextKey(input({ ...UNLOCK.slot, plus: false }))).toBe("unlock");
		expect(nextKey(input(UNLOCK.slot, { late: true }))).toBe("kindling");
		expect(nextKey(input(UNLOCK.slot, { step: -1 }))).toBe("kindling");
		expect(nextKey(input(UNLOCK.slot, { step: null }))).toBe("kindling");
	});

	it("gives the free pitch's place to the upsell, under the pitch's rules", () => {
		expect(nextKey(input(UPSELL.slot))).toBe("upsell");
		expect(nextKey(input(UPSELL.slot, { step: -2 }))).toBe("upsell");
		expect(nextKey(input(UPSELL.slot, { late: true }))).toBe("none");
		expect(nextKey(input(UPSELL.slot, { step: -3 }))).toBe("none");
		expect(nextKey(input({ ...UPSELL.slot, pitchAllowed: false }))).toBe(
			"none"
		);
	});

	it("doesn't need the session to qualify for kindling to show the upsell", () => {
		expect(nextKey(input({ ...UPSELL.slot, qualifies: false }))).toBe("upsell");
	});

	it("keeps a letter to write above the upsell, and the upsell from Xolace+", () => {
		expect(nextKey(input({ ...UPSELL.slot, letters: WRITE }))).toBe(
			"letterWrite"
		);
		expect(nextKey(input({ ...UPSELL.slot, plus: true }))).toBe(
			"kindlingSettingUp"
		);
	});

	it("holds the slot for the unlock and the upsell, 2 s at most", () => {
		expect(nextKey(input({ ...UPSELL.slot, upsell: undefined }))).toBe(
			"loading"
		);
		expect(nextKey(input({ ...UNLOCK.slot, unlock: undefined }))).toBe(
			"loading"
		);
		expect(
			nextKey(input({ ...UPSELL.slot, upsell: undefined, waitedOut: true }))
		).toBe("kfree");
	});

	it("counts the upsell as the ending's one pitch", () => {
		expect(isPitch("upsell")).toBe(true);
		expect(isPitch("kfree")).toBe(true);
		expect(isPitch("unlock")).toBe(false);
		expect(isPitch(null)).toBe(false);
		expect(pitchDismissed("upsell", false)).toBe(true);
		expect(pitchDismissed("upsell", true)).toBe(false);
	});
});

describe("ratingsSignalsOf", () => {
	it("anything but heavier makes the first ask due", () => {
		for (const postSessionMood of ["lighter", "same", "unsure"] as const) {
			expect(ratingsSignalsOf({ moodPosition: 0.5, postSessionMood })).toEqual([
				"light-session",
			]);
		}
	});

	it("a little heavier says nothing", () => {
		expect(
			ratingsSignalsOf({ moodPosition: 0.35, postSessionMood: "heavier" })
		).toEqual([]);
	});

	it("heavy enough for a follow-up holds the ask while it's open", () => {
		expect(
			ratingsSignalsOf({ moodPosition: 0.2, postSessionMood: "heavier" })
		).toEqual(["heavier-follow-up"]);
	});

	it("much heavier (step −4 and below) also starts the 48 h wait", () => {
		for (const moodPosition of [0.13, 0]) {
			expect(
				ratingsSignalsOf({ moodPosition, postSessionMood: "heavier" })
			).toEqual(["heavier-follow-up", "much-heavier"]);
		}
	});
});
