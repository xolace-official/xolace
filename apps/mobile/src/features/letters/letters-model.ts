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
import type { LETTER_MOTION } from "./letter-motion";

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

/**
 * A letter's length, as both limits count it: its words without the space around them (a
 * starter leaves one on the end). What's sent is trimmed the same way.
 */
const letterLength = (text: string): number => text.trim().length;

/** The count under the letter: what's missing under 40, what's left past 400, else nothing. */
export function countLine(text: string): string {
	const len = letterLength(text);
	if (len === 0) {
		return "";
	}
	if (len < LETTER_MIN) {
		return LETTERS.write.countUnder(LETTER_MIN - len);
	}
	return len > COUNT_FROM ? LETTERS.write.countLeft(LETTER_MAX - len) : "";
}

/**
 * A held letter's words, unchanged. Compared trimmed, as the send is: a space added on the end
 * isn't a change, and a held letter sent again counts as a strike (#750).
 */
export const heldAgain = (text: string, held: string): boolean =>
	held.trim() !== "" && text.trim() === held.trim();

/** Send is on: between the limits, and not a held letter sent again unchanged (#750). */
export function canSend(text: string, held: string): boolean {
	const len = letterLength(text);
	return len >= LETTER_MIN && len <= LETTER_MAX && !heldAgain(text, held);
}

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

/**
 * The status a sent row shows. A new one shows as "waiting" until the Letters screen is in front
 * (a push can land while the sender is on the writing screen above it), then lights.
 */
export const sentShown = (l: SentLetter, focused: boolean): SentStatus =>
	l.seen || focused ? l.status : "waiting";

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

/* ---------- The reader (handoff §3, §5) ---------- */

/** An act the reader shows at once and the data module hears only after its 5 s Undo. */
export type Undo = "ack" | "hide";

/**
 * Sealed until it's opened on the server or here: Open shows at once, before the server answers
 * (a failed open seals it again).
 */
export const readerSealed = (l: ReceivedLetter, openedHere: boolean): boolean =>
	!(l.opened || openedHere);

/**
 * Acknowledged on the server, here once its Undo passed, or while its Undo runs. Once true it
 * stays true while the server catches up, so the stamp never lifts and drops again.
 */
export const readerAcknowledged = (
	l: ReceivedLetter | null | undefined,
	acknowledgedHere: boolean,
	undo: Undo | null
): boolean => (l?.acknowledged ?? false) || acknowledgedHere || undo === "ack";

/** Hidden, unless it's being hidden right now: then it drifts away instead. */
export const readerHidden = (
	l: ReceivedLetter | null | undefined,
	undo: Undo | null
): boolean => (l?.hidden ?? false) && undo !== "hide";

/** What VoiceOver can do on the open letter (sealed, Open is its own button). */
export type ReaderAction =
	| "acknowledge"
	| "hide"
	| "unhide"
	| "report"
	| "undo";

/** Sealed, none. While an Undo runs, Undo. Else the acts, Acknowledge only until it's done. */
export function readerActions(r: {
	sealed: boolean;
	undo: Undo | null;
	acknowledged: boolean;
	hidden: boolean;
}): ReaderAction[] {
	if (r.sealed) {
		return [];
	}
	if (r.undo) {
		return ["undo"];
	}
	const acts: ReaderAction[] = r.acknowledged ? [] : ["acknowledge"];
	return [...acts, r.hidden ? "unhide" : "hide", "report"];
}

/**
 * What VoiceOver says as the reader closes for a letter that isn't there: reported (the reader
 * had it, and the sheet took it away), or never there (gone before it loaded, or not yours).
 */
export const readerGoneLine = (hadIt: boolean): string =>
	hadIt ? LETTERS.read.gone : LETTERS.read.notThere;

/**
 * The letter a session end's "A letter is waiting" card opens: the one waiting when the card was
 * kept, still in your letters (opened since is fine: it opens already open). Null once it's gone
 * (reported on another device): the card opens the Letters screen instead. Loading counts as there.
 */
export const readTarget = (
	id: string | null,
	received: readonly { id: string }[] | undefined
): string | null =>
	id !== null && (received === undefined || received.some((l) => l.id === id))
		? id
		: null;

/**
 * Where the reader goes when its letter is gone: back where it was opened from, or the Letters
 * screen. A push tap always goes to Letters: it pushes the reader over the tabs, so there is
 * always something to go back to, and on a cold start that's Today, not where letters live.
 */
export const readerExit = (
	fromPush: boolean,
	canGoBack: boolean
): "back" | "letters" => (fromPush || !canGoBack ? "letters" : "back");

/* ---------- Writing (handoff §3, §5) ---------- */

/** Where the writing screen is: writing, the check running, what it answered. */
export type WriteStage = "edit" | "wait" | "rise" | "sent" | "back" | "rest";

/**
 * Where the letter is. `edit`: the field. `wait`: folded in thirds, the glow lit while the check
 * runs. `rise`: it passed, shrinks to an ember and rises. `rest`: folded, the glow drained (at
 * risk). `back`: the glow drains and it unfolds, words intact. `gone`: risen, nothing left.
 */
export type LetterPhase = "edit" | "wait" | "rise" | "rest" | "back" | "gone";

export const PHASE_OF: Record<WriteStage, LetterPhase> = {
	back: "back",
	edit: "edit",
	rest: "rest",
	rise: "rise",
	sent: "gone",
	wait: "wait",
};

/** How the letter's parts move into a phase. */
export type FoldMoves = {
	/** The thirds: lie flat at once, fold (bottom, then top), unfold (top, then bottom), or stay. */
	bands: "flat" | "fold" | "unfold" | "stay";
	/** The ember glow: off at once, ignite, a still glow (reduced), drain, or stay. */
	glow: "off" | "ignite" | "still" | "drain" | "stay";
	/** The rise's parts (shrink, climb, sway, fade, sparks) back to the start. */
	reset: boolean;
	/** Shrink to an ember and rise, with the sway and sparks. */
	rise: boolean;
};

/** Reduced: no folding, no rising. The sheet crossfades to the folded letter and back. */
export function foldMoves(phase: LetterPhase, reduced: boolean): FoldMoves {
	const still = {
		bands: "stay",
		glow: "stay",
		reset: false,
		rise: false,
	} as const;
	switch (phase) {
		case "edit":
			return { bands: "flat", glow: "off", reset: true, rise: false };
		case "wait":
			return reduced
				? { bands: "flat", glow: "still", reset: true, rise: false }
				: { bands: "fold", glow: "ignite", reset: true, rise: false };
		case "rise":
			return { ...still, glow: "drain", rise: !reduced };
		case "rest":
			return { ...still, glow: "drain" };
		case "back":
			return { ...still, bands: reduced ? "flat" : "unfold", glow: "drain" };
		default:
			return still;
	}
}

/** The wait never ends before the fold and the glow's first rise have played (the board's floor). */
const MIN_WAIT = { full: 1400, reduced: 400 } as const;

/** How much longer the wait holds once the check has answered after `elapsedMs`. */
export const waitLeft = (elapsedMs: number, reduced: boolean): number =>
	Math.max(0, (reduced ? MIN_WAIT.reduced : MIN_WAIT.full) - elapsedMs);

/** How the screen plays an answer: a stage at once, then (after `next.ms`) the next. */
export type AnswerMoves = {
	stage: WriteStage;
	/** The rise's soft press, this long in; null: none. */
	hapticMs: number | null;
	/** Write turns off for this reason (another device used the cap first). */
	limit: WriteLimit | null;
	next: {
		ms: number;
		stage: WriteStage;
		care: boolean;
		line: string | null;
	} | null;
	/** Said as `next` lands, or at once without one. */
	announce: string | null;
};

/**
 * Rise: "It's on its way." at +2 s. Care: the letter rests and the sheet rises. Limit: back to
 * editing with the limit said. Back: the letter unfolds, then its line (fixable, held, not
 * English). Reduced, every wait is the 200 ms fade. The timings are letters' motion (`M`),
 * passed in so this stays free of Reanimated.
 */
export function afterAnswer(
	answer: SendAnswer,
	reduced: boolean,
	M: typeof LETTER_MOTION
): AnswerMoves {
	const ms = (full: number) => (reduced ? M.reducedMs : full);
	const none = { hapticMs: null, limit: null } as const;
	switch (answer.next) {
		case "rise":
			return {
				announce: LETTERS.sent.title,
				hapticMs: reduced ? 0 : M.send.rise.delayMs,
				limit: null,
				next: {
					care: false,
					line: null,
					ms: ms(M.send.lineAtMs),
					stage: "sent",
				},
				stage: "rise",
			};
		case "care":
			return {
				...none,
				announce: null,
				next: {
					care: true,
					line: null,
					ms: ms(M.risk.sheetAtMs),
					stage: "rest",
				},
				stage: "rest",
			};
		case "limit":
			return {
				announce: LETTERS.limit[answer.reason],
				hapticMs: null,
				limit: answer.reason,
				next: null,
				stage: "edit",
			};
		default: {
			const line = answer.line || null;
			return {
				...none,
				announce: line,
				next: { care: false, line, ms: ms(M.back.editAtMs), stage: "edit" },
				stage: "back",
			};
		}
	}
}

/** What an answer does to the draft on the device: nothing, clear it, or keep it as held. */
export type DraftChange = { clear: true } | { held: string } | null;

/**
 * `answer` is null when the send failed: everything stays. A pass clears the draft, but only if
 * it still holds the words sent (a reopened writing screen may have changed them since). A held
 * letter keeps its words, and remembers them trimmed, as they were sent.
 */
export function draftAfter(
	answer: SendAnswer | null,
	sent: string,
	now: string
): DraftChange {
	if (answer?.next === "rise") {
		return now.trim() === sent.trim() ? { clear: true } : null;
	}
	if (answer?.next === "back" && answer.held) {
		return { held: sent.trim() };
	}
	return null;
}

/** What a writing screen shows for an answer it didn't wait for (`lateMoves`). */
export type LateMoves = {
	stage: "edit" | "rest";
	line: string | null;
	care: boolean;
	announce: string | null;
};

/**
 * An answer that came while Write was closed, or for a check another screen started, played once
 * on the screen that's up: no fold or unfold (the letter never folded here), straight to where
 * the answer leaves it. A line (fixable, held, not English) shows over the words; care rests the
 * letter and raises the sheet. Only those are kept for later (`check-store.ts`).
 */
export function lateMoves(answer: SendAnswer): LateMoves | null {
	if (answer.next === "care") {
		return { announce: null, care: true, line: null, stage: "rest" };
	}
	if (answer.next === "back") {
		const line = answer.line || null;
		return { announce: line, care: false, line, stage: "edit" };
	}
	return null;
}
