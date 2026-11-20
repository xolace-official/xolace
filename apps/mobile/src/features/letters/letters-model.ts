import {
	COUNT_FROM,
	LETTER_MAX,
	LETTER_MIN,
	LETTERS,
	type LetterFor,
} from "./copy";
import type { LETTER_MOTION } from "./letter-motion";

export type OptIn = "unset" | "yes" | "no";
export type WriteLimit = "today" | "three";
export type SentStatus =
	| "waiting"
	| "received"
	| "acknowledged"
	| "returned"
	| "held";

export const sentLit = (status: SentStatus): boolean =>
	status === "received" || status === "acknowledged";

export const sentDismissable = (status: SentStatus): boolean =>
	status === "returned" || status === "held";

export type SentLetter = {
	id: string;
	line: string;
	status: SentStatus;
	seen: boolean;
};

export type ReceivedLetter = {
	id: string;
	text: string;
	opened: boolean;
	acknowledged: boolean;
	hidden: boolean;
};

export type LettersStatus = {
	optIn: OptIn;
	writeLimit: WriteLimit | null;
	unopenedId: string | null;
	invite: boolean;
};

export type Draft = { text: string; forWho: LetterFor };

export type SendOutcome =
	| { kind: "pass" }
	| { kind: "unavailable" }
	| { kind: "fixable"; line: string }
	| { kind: "risk" }
	| { kind: "held" }
	| { kind: "lang" }
	| { kind: "limit"; reason: WriteLimit };

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

const LINE_MAX = 46;
const LINE_CUT = 44;
export function openingLine(text: string): string {
	const first = text.split("\n")[0] ?? "";
	return first.length > LINE_MAX
		? `${first.slice(0, LINE_CUT).replace(/\s+\S*$/, "")}…`
		: first;
}

const letterLength = (text: string): number => text.trim().length;

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

export const heldAgain = (text: string, held: string): boolean =>
	held.trim() !== "" && text.trim() === held.trim();

export function canSend(text: string, held: string): boolean {
	const len = letterLength(text);
	return len >= LETTER_MIN && len <= LETTER_MAX && !heldAgain(text, held);
}

export const withStarter = (text: string, starter: string): string =>
	`${text ? text.replace(/\s*$/, " ") : ""}${starter} `.slice(0, LETTER_MAX);

export function forYouRows(received: readonly ReceivedLetter[]): {
	reread: ReceivedLetter[];
	hidden: ReceivedLetter[];
} {
	return {
		hidden: received.filter((l) => l.hidden),
		reread: received.filter((l) => l.opened && !l.hidden),
	};
}

export const sentShown = (l: SentLetter, focused: boolean): SentStatus =>
	l.seen || focused ? l.status : "waiting";

export const receivedRowSub = (l: ReceivedLetter): string => {
	if (l.hidden) {
		return LETTERS.read.rowHidden;
	}
	return l.acknowledged
		? LETTERS.read.rowAcknowledged
		: LETTERS.read.rowReceived;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WRITE_EVERY_DAYS = 7;
const PASS_OVER_LIMIT = 3;
const OFF_DAYS = 30;

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
			status.invite &&
			status.writeLimit === null &&
			!recent &&
			now >= memory.offUntil,
	};
}

export const endCardShown = (m: EndCardMemory, now: number): EndCardMemory => ({
	...m,
	shownAt: now,
});

export function endCardPassed(m: EndCardMemory, now: number): EndCardMemory {
	const passes = m.passes + 1;
	if (passes < PASS_OVER_LIMIT) {
		return { ...m, passes };
	}
	return { ...m, offUntil: now + OFF_DAYS * DAY_MS, passes: 0 };
}

export const endCardTaken = (m: EndCardMemory): EndCardMemory => ({
	...m,
	passes: 0,
});

export type Undo = "ack" | "hide";

export const readerSealed = (l: ReceivedLetter, openedHere: boolean): boolean =>
	!(l.opened || openedHere);

export const readerAcknowledged = (
	l: ReceivedLetter | null | undefined,
	acknowledgedHere: boolean,
	undo: Undo | null
): boolean => (l?.acknowledged ?? false) || acknowledgedHere || undo === "ack";

export const readerHidden = (
	l: ReceivedLetter | null | undefined,
	undo: Undo | null
): boolean => (l?.hidden ?? false) && undo !== "hide";

export type ReaderAction =
	| "acknowledge"
	| "hide"
	| "unhide"
	| "report"
	| "undo";

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

export const readerGoneLine = (hadIt: boolean): string =>
	hadIt ? LETTERS.read.gone : LETTERS.read.notThere;

export const readTarget = (
	id: string | null,
	received: readonly { id: string }[] | undefined
): string | null =>
	id !== null && (received === undefined || received.some((l) => l.id === id))
		? id
		: null;

export const readerExit = (
	fromPush: boolean,
	canGoBack: boolean
): "back" | "letters" => (fromPush || !canGoBack ? "letters" : "back");

export type WriteStage = "edit" | "wait" | "rise" | "sent" | "back" | "rest";

export type LetterPhase = "edit" | "wait" | "rise" | "rest" | "back" | "gone";

export const PHASE_OF: Record<WriteStage, LetterPhase> = {
	back: "back",
	edit: "edit",
	rest: "rest",
	rise: "rise",
	sent: "gone",
	wait: "wait",
};

export type FoldMoves = {
	bands: "flat" | "fold" | "unfold" | "stay";
	glow: "off" | "ignite" | "still" | "drain" | "stay";
	reset: boolean;
	rise: boolean;
};

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

const MIN_WAIT = { full: 1400, reduced: 400 } as const;

export const waitLeft = (elapsedMs: number, reduced: boolean): number =>
	Math.max(0, (reduced ? MIN_WAIT.reduced : MIN_WAIT.full) - elapsedMs);

export type AnswerMoves = {
	stage: WriteStage;
	hapticMs: number | null;
	limit: WriteLimit | null;
	next: {
		ms: number;
		stage: WriteStage;
		care: boolean;
		line: string | null;
	} | null;
	announce: string | null;
};

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

export type DraftChange = { clear: true } | { held: string } | null;

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

export type LateMoves = {
	stage: "edit" | "rest";
	line: string | null;
	care: boolean;
	announce: string | null;
};

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
