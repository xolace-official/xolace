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
