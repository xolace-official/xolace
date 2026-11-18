/**
 * Letters' data: every read and call the screens make, in one place, shaped as `backend.md`
 * §2.3 Letters. This is the seam S21 plugs the contract into: the hook names, their returns and
 * the calls' signatures stay; only the bodies change, to Convex queries and mutations. Until
 * then it reads the in-memory stand-in (`letters-memory.ts`) and calls nothing on the server.
 *
 * Reads are narrow on purpose: the Connect card sits under the writing screen, so each part
 * subscribes only to what it draws (a keystroke there redraws none of them).
 *
 * Every read is `undefined` while it loads, as a Convex `useQuery` is on its first render. The
 * in-memory stand-in answers at once, but the screens already treat `undefined` as "loading",
 * never as empty: the reader waits rather than closing (its `null` means the letter is gone),
 * and the status draws neither the offer nor Write until it knows.
 */
import { useShallow } from "zustand/react/shallow";
import type { ReportReason } from "./copy";
import {
	type LettersMemory,
	limitOf,
	memory,
	unopenedOf,
	useLettersMemory,
} from "./letters-memory";
import type {
	Draft,
	LettersStatus,
	OptIn,
	ReceivedLetter,
	SendOutcome,
	SentLetter,
} from "./letters-model";

/** The status, from the server's side of letters. */
export const statusOf = (m: LettersMemory): LettersStatus => ({
	optIn: m.optIn,
	unopenedId: unopenedOf(m),
	writeLimit: limitOf(m),
});

/** The one small status read: the opt-in, why Write is off, the unopened letter. */
export function useLettersStatus(): LettersStatus | undefined {
	return useLettersMemory(useShallow(statusOf));
}

/** Your sent letters, newest first. Withdrawn ones are gone. */
export function useSentLetters(): readonly SentLetter[] | undefined {
	return useLettersMemory((m) => m.sent);
}

/** Letters for you, newest first, hidden ones included. Reported ones never come back. */
export function useReceivedLetters(): readonly ReceivedLetter[] | undefined {
	return useLettersMemory((m) => m.received);
}

/** One letter for you; `null` once it's gone (reported, or not yours). */
export function useReceivedLetter(
	id: string
): ReceivedLetter | null | undefined {
	return useLettersMemory((m) => m.received.find((l) => l.id === id) ?? null);
}

/** Settings › Notifications › Letters, on by default. */
export function useLettersPush(): boolean | undefined {
	return useLettersMemory((m) => m.push);
}

/** What the screens ask of letters' server side; S21 makes each one a Convex call. */
export type LettersCalls = {
	/** The check reads it (1–8 s on the server); the outcome says what the sender sees. */
	send: (draft: Draft) => Promise<SendOutcome>;
	withdraw: (id: string) => Promise<"ok" | "received">;
	/** The Letters screen showed these statuses: their marks light once, across devices. */
	markSeen: (ids: readonly string[]) => Promise<void>;
	setOptIn: (optIn: Exclude<OptIn, "unset">) => Promise<void>;
	/** Opening is what lets the next letter be placed. */
	open: (id: string) => Promise<void>;
	/** Called after the 5 s undo, so an undone acknowledge never reaches the sender. */
	acknowledge: (id: string) => Promise<void>;
	/** Called after the 5 s undo; also stops that sender being matched to you again. */
	hide: (id: string) => Promise<void>;
	unhide: (id: string) => Promise<void>;
	report: (id: string, reason: ReportReason) => Promise<void>;
	setPush: (on: boolean) => Promise<void>;
};

const CALLS: LettersCalls = {
	acknowledge: async (id) => memory.acknowledge(id),
	hide: async (id) => memory.hide(id),
	markSeen: async (ids) => memory.markSeen(ids),
	open: async (id) => memory.open(id),
	report: async (id) => memory.report(id),
	send: async (draft) => memory.send(draft),
	setOptIn: async (optIn) => memory.setOptIn(optIn),
	setPush: async (on) => memory.setPush(on),
	unhide: async (id) => memory.unhide(id),
	withdraw: async (id) => memory.withdraw(id),
};

/** The calls, stable across renders. */
export function useLettersCalls(): LettersCalls {
	return CALLS;
}
