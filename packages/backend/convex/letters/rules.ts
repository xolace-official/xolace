/**
 * Letters' named numbers and the pure rules over a row (spec:
 * docs/plan/letters.md). No database access here.
 */
import type { Doc } from "../_generated/dataModel";
import type { SentStatus } from "./validators";

/** A letter's trimmed length (#747). The client's limits are the same. */
export const LETTER_MIN_CHARS = 40;
export const LETTER_MAX_CHARS = 500;

/** Letters a sender may have waiting (unchecked counts) at once. */
export const WAITING_MAX = 3;

/** The most Sent rows a list returns. */
export const SENT_LIST_MAX = 50;

/**
 * Rows `sent.list` reads to fill it: held letters are read and skipped, so a
 * sender with more held letters than the difference among their newest rows
 * sees a shorter list, never an unbounded read. Held letters use the day, so
 * that takes months of them.
 */
export const SENT_LIST_READ_MAX = SENT_LIST_MAX * 4;

/** The most received letters a list returns. */
export const RECEIVED_LIST_MAX = 100;

/** How many ids one `markSeen` call may carry. */
export const MARK_SEEN_MAX = 50;

/** A Sent row's opening line: the first paragraph, cut at a word. */
const LINE_MAX = 46;
const LINE_CUT = 44;

/** Strikes inside the window that pause a sender, and for how long (#750). */
export const STRIKES_TO_PAUSE = 2;
export const STRIKE_WINDOW_DAYS = 90;
export const PAUSE_DAYS = 30;

export const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** A recipient's latest session older than this leaves them out of the pool. */
export const METADATA_FRESH_DAYS = 14;
/** At most one letter a week per recipient (#749). */
export const RECIPIENT_REST_DAYS = 7;
/** A session at or above this intensity puts its person in the heavier band. */
export const HEAVIER_FROM = 6;
/** A letter's aim steers matching for this long after it passes the check. */
export const AIM_WINDOW_HOURS = 72;
/**
 * Candidates one placement may try per band before it gives up for now. Those
 * turned away for this sender alone (a block) stay in the pool and are stepped
 * past; those turned away for themselves (quiet hours, an open hard follow-up)
 * are refreshed out of it. Each try is about ten reads, and a placement runs
 * in its own mutation.
 */
export const CANDIDATES_TRIED_MAX = 100;
/**
 * How long someone with an open hard follow-up stays out of the pool before a
 * refresh looks again: one sweep.
 */
export const FOLLOW_UP_LOOK_AGAIN_MS = HOUR_MS;
/**
 * The recipient's push at placement goes out a random time in this range
 * later; the sender's goes at once. The sender's Sent row turns `received` at
 * placement, so a recipient's phone buzzing at the same moment would tell a
 * sender beside them who got their letter (spec §6).
 */
export const RECIPIENT_PUSH_DELAY_MS = {
	max: 2 * HOUR_MS,
	min: 15 * MINUTE_MS,
} as const;

/** A random delay inside `RECIPIENT_PUSH_DELAY_MS`. */
export function recipientPushDelay(random = Math.random()): number {
	const { max, min } = RECIPIENT_PUSH_DELAY_MS;
	return Math.round(min + random * (max - min));
}
/** A letter still waiting this long after it passed is returned (decision C). */
export const LETTER_WAIT_DAYS = 30;
/**
 * The waiting pool may hold this many days of recent placements before the
 * session-end write card stops inviting letters (§9).
 */
export const INVITE_BACKLOG_DAYS = 7;
/** How often the sweep runs in production. */
export const SWEEP_EVERY_HOURS = 1;
/** Rows one sweep step handles before it schedules the next page. */
export const SWEEP_BATCH = 50;
/** The most placements the invite count reads; past it the backlog is moot. */
export const INVITE_COUNT_MAX = 1000;
/**
 * When an unchecked letter is re-checked, after it was stored (§5.4); after
 * the last, each sweep tries again.
 */
export const RECHECK_DELAYS_MS = [
	5 * MINUTE_MS,
	30 * MINUTE_MS,
	2 * HOUR_MS,
] as const;

export const AIM_WINDOW_MS = AIM_WINDOW_HOURS * HOUR_MS;

/**
 * How far past its due time a re-check must be before the sweep runs it
 * itself: room for the scheduled one to land first.
 */
export const RECHECK_OVERDUE_MS = 10 * MINUTE_MS;
/**
 * The most re-checks one sweep starts. During a classifier outage every
 * unchecked letter is due at once; the rest wait for the next sweep.
 */
export const RECHECK_SWEEP_MAX = 25;

/**
 * The opening line the Sent list shows, cut the way S20's `openingLine` cuts
 * it, so the list never ships a letter's whole text back.
 */
export function openingLine(text: string): string {
	const first = text.split("\n")[0] ?? "";
	return first.length > LINE_MAX
		? `${first.slice(0, LINE_CUT).replace(/\s+\S*$/, "")}…`
		: first;
}

/** What the sender's Sent row says for a stored letter; `null` = not shown. */
export function sentStatusOf(letter: Doc<"letters">): SentStatus | null {
	switch (letter.status) {
		case "unchecked":
		case "waiting":
			return "waiting";
		case "received":
			return letter.acknowledgedAt === undefined ? "received" : "acknowledged";
		case "returned":
			return "returned";
		case "held":
			// The sender saw "This letter can't be sent" and kept their words.
			return null;
		default:
			return null;
	}
}

/** Whether the sender has seen a row's current status. Waiting is never news. */
export function sentSeen(letter: Doc<"letters">): boolean {
	const status = sentStatusOf(letter);
	return status === "waiting" || letter.senderSeen === status;
}

/** A waiting slot is used by a letter not yet placed, checked or not. */
export function holdsWaitingSlot(status: Doc<"letters">["status"]): boolean {
	return status === "waiting" || status === "unchecked";
}

/** SHA-256 of the trimmed text, hex: how held words are known again. */
export async function textHashOf(text: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(text.trim())
	);
	return Array.from(new Uint8Array(digest), (b) =>
		b.toString(16).padStart(2, "0")
	).join("");
}
