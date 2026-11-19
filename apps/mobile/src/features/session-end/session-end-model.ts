/**
 * After a session, as pure functions: which path's words to show, what the
 * mood answer saves, the day chip, and the one next step (`nextKey`). No React,
 * no Convex: the data hook feeds these, and so do the dev states' fixtures.
 */
import {
	PLUS_OFFER_COOLDOWN_MS,
	PLUS_OFFER_DISMISSAL_LIMIT,
	PLUS_OFFER_FULL_STOP_MS,
} from "@/features/purchases/plus-offer-policy";
import { asksFollowUp, moodOf } from "./mood-scale";

/** The route's `path` param: Sit with this ("solo"), You're not alone, or the mirror's exit. */
export type SessionPath = "solo" | "peers" | "exit";
/** Which line moment 2 shows under its title. */
export type SessionFrom = "sit" | "peers";

export const pathOf = (param: string | undefined): SessionPath =>
	param === "solo" || param === "peers" ? param : "exit";

/** The exit ends straight after the mirror: there's nothing of a path to leave for anyone. */
export const fromOf = (path: SessionPath): SessionFrom | null => {
	if (path === "solo") {
		return "sit";
	}
	return path === "peers" ? "peers" : null;
};

/**
 * The words moment 2 offers to leave for someone: the session's distilled text,
 * only after a path (production showed the share only there), never empty.
 */
export function wordsToShare(
	path: SessionPath,
	distilledText: string | null | undefined
): string | null {
	const text = distilledText?.trim();
	return fromOf(path) && text ? text : null;
}

export type PostSessionMood = "heavier" | "same" | "lighter" | "unsure";
export type SavedMood = {
	postSessionMood: PostSessionMood;
	moodPosition?: number;
};

/** What Continue saves: the answer and where the thumb was; "not sure" has no position. */
export function savedMood({
	step,
	unsure,
	position,
}: {
	step: number | null;
	unsure: boolean;
	position: number;
}): SavedMood | null {
	if (unsure) {
		return { postSessionMood: "unsure" };
	}
	return step === null
		? null
		: { moodPosition: position, postSessionMood: moodOf(step) };
}

/**
 * The day chip: the streak before this session and after it. Equal (no roll)
 * when today had already counted, or when it isn't known whether it had.
 */
export function dayOf(
	streak: number,
	countedBefore: boolean | null
): { from: number; to: number } {
	const to = Math.max(1, streak);
	return { from: countedBefore === false ? Math.max(0, to - 1) : to, to };
}

/** What a Continue tap does: nothing (moment 2 already, or the follow-up is open), ask the
 * heavier follow-up first (once, step −3 down, not late, not within its 24 h), or go on. */
export type ContinueStep = "ignore" | "ask" | "go";

export function continueStep({
	moment,
	pending,
	late,
	asked,
	canAsk,
	step,
}: {
	moment: 1 | 2;
	/** The follow-up sheet is open, or moment 2 is on its way. */
	pending: boolean;
	late: boolean;
	asked: boolean;
	canAsk: boolean;
	step: number | null;
}): ContinueStep {
	if (moment !== 1 || pending) {
		return "ignore";
	}
	return !(late || asked) && canAsk && asksFollowUp(step) ? "ask" : "go";
}

/**
 * Moment 1's way out, taken once: Continue opens the follow-up or moves on,
 * and the move to moment 2 happens once however many callers ask (a second tap,
 * the sheet closing). `busy` once either has started.
 */
export function momentGate() {
	let pending = false;
	let entered = false;
	return {
		get busy() {
			return pending || entered;
		},
		/** True the first time only: run the move to moment 2 then. */
		enter: () => {
			if (entered) {
				return false;
			}
			entered = true;
			pending = true;
			return true;
		},
		/** The follow-up opened: Continue waits for it. */
		hold: () => {
			pending = true;
		},
	};
}

/** The pinned button: 0 "Skip for now", 1 "Continue", 2 "I'm done for now". */
export function ctaLabel({
	moment,
	late,
	step,
	unsure,
}: {
	moment: 1 | 2;
	late: boolean;
	step: number | null;
	unsure: boolean;
}): 0 | 1 | 2 {
	if (moment === 2) {
		return 2;
	}
	return late || step !== null || unsure ? 1 : 0;
}

/**
 * What the one next-step slot shows. `none` fades it away; `loading` holds it
 * while a listener match is pending.
 */
export type NextKey =
	| "listener"
	| "letterRead"
	| "kindling"
	| "kindlingSettingUp"
	| "letterWrite"
	| "listen"
	| "kfree"
	| "loading"
	| "none";

/**
 * What letters may offer, before this session's own rules (composed in by the route: letters'
 * `endCardOffer`). `waiting`: a letter waits to be opened. `write`: no safeguard, the sender
 * can write, and the card is neither resting a week after showing nor 30 days after three passes.
 */
export type LetterOffer = { waiting: boolean; write: boolean };

export type NextInput = {
	/** A listener match: still asking, one found, or none (for everyone, not plan-gated). */
	listener: "pending" | "found" | "none";
	plus: boolean;
	/** The session qualifies for kindling; undefined while that's still being read. */
	qualifies: boolean | undefined;
	/** Xolace+: this session's kindling has landed. */
	kindlingReady: boolean;
	/** A track to suggest (no backend pick yet: open question 8). */
	listen: boolean;
	/** Letters' two cards; undefined while letters load. */
	letters: LetterOffer | undefined;
	late: boolean;
	step: number | null;
	/** The free pitch's cadence allows it (`pitchAllowed`). */
	pitchAllowed: boolean;
	/** The slot has held 2 s: anything still unknown counts as no (offline, say). */
	waitedOut: boolean;
};

/** A letter card follows only a steady answer (the same or lighter), never late. Unanswered isn't steady. */
const steadyFor = (late: boolean, step: number | null): boolean =>
	!late && step !== null && step >= 0;

/**
 * One card at most, in order (letters' handoff §2 fitted into production's slot):
 * 1. a matched listener, for everyone;
 * 2. a letter waiting to be opened, after a steady answer;
 * 3. Xolace+: kindling, or "setting up" until it lands;
 * 4. write a letter, after a steady answer; it outranks the free pitch (handoff §7);
 * 5. Xolace+: something to listen to;
 * 6. free: the ending's one Xolace+ pitch, never late, never after a heavier answer (step −3
 *    down), and only when the session qualifies and the cadence allows it;
 * 7. nothing.
 * The slot holds (loading) at most 2 s for the listener match, the plan and kindling, and letters.
 */
export function nextKey(input: NextInput): NextKey {
	const { listener, plus, late, step, waitedOut } = input;
	const unknown = input.qualifies === undefined || input.letters === undefined;
	if (listener === "pending" || (unknown && !waitedOut)) {
		return "loading";
	}
	if (listener === "found") {
		return "listener";
	}
	const steady = steadyFor(late, step);
	const letters = input.letters ?? { waiting: false, write: false };
	if (steady && letters.waiting) {
		return "letterRead";
	}
	const qualifies = input.qualifies ?? false;
	if (plus && qualifies) {
		return input.kindlingReady ? "kindling" : "kindlingSettingUp";
	}
	if (steady && letters.write) {
		return "letterWrite";
	}
	if (plus) {
		return input.listen ? "listen" : "none";
	}
	if (!qualifies || late || asksFollowUp(step) || !input.pitchAllowed) {
		return "none";
	}
	return "kfree";
}

export type PitchContext = {
	safeguardActive: boolean;
	/** This session and the one before it (`plusOffers.offerContext`). */
	sessionId: string | null;
	previousSessionId: string | null;
	/** The device's offer memory (`plus-offer-slice`). */
	shownSessionId: string | null;
	lastDismissedAt: number | undefined;
	dismissalCount: number;
	fullStopSince: number | null;
	now: number;
};

/**
 * The free kindling pitch shares the session close's offer rules
 * (`plus-offer-policy.ts`): never during a safeguard, never two sessions
 * running, a week of quiet after a dismissal, a month after three.
 */
export function pitchAllowed(c: PitchContext): boolean {
	if (c.safeguardActive) {
		return false;
	}
	const stopped =
		c.dismissalCount >= PLUS_OFFER_DISMISSAL_LIMIT &&
		c.fullStopSince !== null &&
		c.now - c.fullStopSince < PLUS_OFFER_FULL_STOP_MS;
	const shownThis = c.sessionId !== null && c.shownSessionId === c.sessionId;
	const shownLast =
		c.previousSessionId !== null && c.shownSessionId === c.previousSessionId;
	const cooling =
		c.lastDismissedAt !== undefined &&
		c.now - c.lastDismissedAt < PLUS_OFFER_COOLDOWN_MS;
	// Shown this session already means it's this pitch: it may stay.
	return !(stopped || cooling || (shownLast && !shownThis));
}

/**
 * What moment 2 keeps from the moment it opens: before it, nothing; as it opens,
 * the value then; after, the same box, so a late answer (the session landing
 * after the arrival's 4 s fallback) never changes what the reader sees.
 */
export function keptAtMoment2<T>(
	kept: { value: T } | null,
	moment: 1 | 2,
	live: T
): { value: T } | null {
	if (kept !== null || moment !== 2) {
		return kept;
	}
	return { value: live };
}

/** Leaving with the free pitch shown and not taken is a "no": it spends the cooldown. */
export const pitchDismissed = (
	shown: NextKey | null,
	taken: boolean
): boolean => shown === "kfree" && !taken;

/** Leaving with the write card shown and not taken passes it over (three running: 30 days off). */
export const letterPassed = (shown: NextKey | null, taken: boolean): boolean =>
	shown === "letterWrite" && !taken;

export const slotEmpty = (key: NextKey): boolean => key === "none";
