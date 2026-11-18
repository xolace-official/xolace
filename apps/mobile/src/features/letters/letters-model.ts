/**
 * Letters, pure: what the screens show from what the contract serves (`backend.md` §2.3
 * Letters, a UI wish list until `docs/plan/letters.md` exists). No React, no storage.
 */
import {
	COUNT_FROM,
	LETTER_MAX,
	LETTER_MIN,
	LETTERS,
	type LetterFor,
} from "./copy";

/** The offer to receive: not answered yet, Yes, or Not now (which never asks again). */
export type OptIn = "unset" | "yes" | "no";
/** Why Write is off, if it is: today's letter first, then three waiting. Nothing else. */
export type WriteLimit = "today" | "three";
export type SentStatus = "waiting" | "received" | "acknowledged";

/** A sent letter as its sender sees it: its opening line and status, nothing about the recipient. */
export type SentLetter = {
	id: string;
	line: string;
	status: SentStatus;
	/** The sender has seen this status: the received mark lights the first time they do. */
	seen: boolean;
};

/** A letter for you. No date, no sender, no reason, no "For". */
export type ReceivedLetter = {
	id: string;
	/** Paragraphs split on "\n". */
	text: string;
	opened: boolean;
	acknowledged: boolean;
	/** Hidden letters aren't deleted: they sit under Hidden · N. */
	hidden: boolean;
};

/** The one small status read the card, the Letters screen and session end share. */
export type LettersStatus = {
	optIn: OptIn;
	writeLimit: WriteLimit | null;
	/** The letter waiting to be opened (only while receiving is on); it blocks any other. */
	unopenedId: string | null;
};

export type Draft = { text: string; forWho: LetterFor };

/**
 * What the check answers at Send (#750). `unavailable` (the checks couldn't finish) reads to the
 * sender exactly as `pass`; `today` and `three` mean another device used the caps first.
 */
export type SendOutcome =
	| { kind: "pass" }
	| { kind: "unavailable" }
	| { kind: "fixable"; line: string }
	| { kind: "risk" }
	| { kind: "held" }
	| { kind: "lang" }
	| { kind: "limit"; reason: WriteLimit };

/** How the writing screen answers an outcome: it rises, comes back with a line, rests for care, or says the limit. */
export type SendAnswer =
	| { next: "rise" }
	| { next: "back"; line: string; held: boolean }
	| { next: "care" }
	| { next: "limit"; reason: WriteLimit };

export function answerOf(outcome: SendOutcome): SendAnswer {
	switch (outcome.kind) {
		case "pass":
		case "unavailable":
			return { next: "rise" };
		case "fixable":
			return { held: false, line: outcome.line, next: "back" };
		case "held":
			return { held: true, line: LETTERS.check.held, next: "back" };
		case "lang":
			return { held: false, line: LETTERS.check.lang, next: "back" };
		case "risk":
			return { next: "care" };
		case "limit":
			return { next: "limit", reason: outcome.reason };
		default:
			return outcome satisfies never;
	}
}

/** The Connect card's status line, first that applies (handoff §1). */
export function cardStatus(s: LettersStatus): string {
	if (s.unopenedId !== null) {
		return LETTERS.card.waitingForYou;
	}
	if (s.writeLimit === "today") {
		return LETTERS.card.wroteToday;
	}
	if (s.writeLimit === "three") {
		return LETTERS.card.threeWaiting;
	}
	return LETTERS.card.invite;
}

/** A row's opening line: the first paragraph, cut at a word near 46 characters. */
const LINE_MAX = 46;
const LINE_CUT = 44;
export function openingLine(text: string): string {
	const first = text.split("\n")[0] ?? "";
	return first.length > LINE_MAX
		? `${first.slice(0, LINE_CUT).replace(/\s+\S*$/, "")}…`
		: first;
}

/** The count under the letter: what's missing under 40, what's left past 400, else nothing. */
export function countLine(text: string): string {
	const len = text.trim().length;
	if (len === 0) {
		return "";
	}
	if (len < LETTER_MIN) {
		return LETTERS.write.countUnder(LETTER_MIN - len);
	}
	return len > COUNT_FROM
		? LETTERS.write.countLeft(LETTER_MAX - text.length)
		: "";
}

/** Send is on: writing, long enough, and not a held letter sent again unchanged (#750). */
export const canSend = (text: string, held: string): boolean =>
	text.trim().length >= LETTER_MIN && !(held !== "" && text === held);

/** A starter goes on the end of the words, after one space, and stays editable. */
export const withStarter = (text: string, starter: string): string =>
	`${text ? text.replace(/\s*$/, " ") : ""}${starter} `.slice(0, LETTER_MAX);

/** For you, split: the letters to reread, and the hidden ones under Hidden · N. */
export function forYouRows(received: readonly ReceivedLetter[]): {
	reread: ReceivedLetter[];
	hidden: ReceivedLetter[];
} {
	return {
		hidden: received.filter((l) => l.hidden),
		reread: received.filter((l) => l.opened && !l.hidden),
	};
}

/** A received letter's row line under its opening line. */
export const receivedRowSub = (l: ReceivedLetter): string => {
	if (l.hidden) {
		return LETTERS.read.rowHidden;
	}
	return l.acknowledged
		? LETTERS.read.rowAcknowledged
		: LETTERS.read.rowReceived;
};

/* ---------- The session-end cards (handoff §2) ---------- */

const DAY_MS = 24 * 60 * 60 * 1000;
/** The write card rests this long after it shows. */
const WRITE_EVERY_DAYS = 7;
/** Passed over this many times running, it rests for OFF_DAYS. */
const PASS_OVER_LIMIT = 3;
const OFF_DAYS = 30;

/** The write card's memory, on the device: when it last showed, passes running, rest until. */
export type EndCardMemory = {
	shownAt: number | null;
	passes: number;
	offUntil: number;
};
export const END_CARD_FRESH: EndCardMemory = {
	offUntil: 0,
	passes: 0,
	shownAt: null,
};

/**
 * What letters may offer at a session end, before the session's own rules (step ≥ 0, not
 * late), which session end's `nextKey` applies. `waiting`: a letter is waiting to be opened.
 * `write`: no safeguard, the sender can write, and the card neither showed in the last 7 days
 * nor is resting 30 days after three passes.
 */
export type EndCardOffer = { waiting: boolean; write: boolean };

export function endCardOffer(
	status: LettersStatus,
	memory: EndCardMemory,
	safeguard: boolean,
	now: number
): EndCardOffer {
	const recent =
		memory.shownAt !== null && now - memory.shownAt < WRITE_EVERY_DAYS * DAY_MS;
	return {
		waiting: status.unopenedId !== null,
		write:
			!safeguard &&
			status.writeLimit === null &&
			!recent &&
			now >= memory.offUntil,
	};
}

/** The write card showed: it rests for 7 days. */
export const endCardShown = (m: EndCardMemory, now: number): EndCardMemory => ({
	...m,
	shownAt: now,
});

/** Left the session end without taking it: the third pass running rests it for 30 days. */
export function endCardPassed(m: EndCardMemory, now: number): EndCardMemory {
	const passes = m.passes + 1;
	if (passes < PASS_OVER_LIMIT) {
		return { ...m, passes };
	}
	return { ...m, offUntil: now + OFF_DAYS * DAY_MS, passes: 0 };
}

/** Taken: the count of passes starts over. */
export const endCardTaken = (m: EndCardMemory): EndCardMemory => ({
	...m,
	passes: 0,
});
