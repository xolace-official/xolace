/**
 * What stands in for the letters contract until B12: the server's side of letters, in memory
 * for this app run. Only `use-letters-data.ts` reads it; S21 replaces both bodies with Convex
 * and deletes this file. A dev build starts from the board's letters (`src/dev/letters-seed.ts`);
 * a release build starts empty, so every screen shows its empty state.
 *
 * It answers every send as a pass: the check's other outcomes are the classifier's, and the
 * writing screen's dev states drive them on fixtures. So a send in any build lands here and
 * nowhere else: no one receives it. That's acceptable only while letters stay unreleased;
 * S21 must replace this before they ship.
 */
import { create } from "zustand";
import type {
	Draft,
	OptIn,
	ReceivedLetter,
	SendOutcome,
	SentLetter,
	WriteLimit,
} from "./letters-model";
import { openingLine } from "./letters-model";

/** The contract's caps (#747–#750): one letter a day, three waiting at once. */
const LETTERS_PER_DAY = 1;
const MAX_WAITING = 3;

export type LettersMemory = {
	optIn: OptIn;
	/** Settings › Notifications › Letters: on by default, separate from the opt-in. */
	push: boolean;
	sent: readonly SentLetter[];
	received: readonly ReceivedLetter[];
	/** Letters written on `day` (the device's local day, "YYYY-MM-DD"). */
	written: { day: string; count: number };
};

type Seed = typeof import("@/dev/letters-seed");
const seed: Seed | null = __DEV__ ? require("@/dev/letters-seed") : null;

/** The device's local day, "YYYY-MM-DD": the one-a-day cap turns over at local midnight. */
export function localDay(now: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const EMPTY: LettersMemory = {
	optIn: "unset",
	push: true,
	received: [],
	sent: [],
	written: { count: 0, day: "" },
};

export const useLettersMemory = create<LettersMemory>()(() => ({
	...(seed?.SEED ?? EMPTY),
}));

const get = () => useLettersMemory.getState();
const set = (patch: Partial<LettersMemory>) => useLettersMemory.setState(patch);

/** Letters written on today's local day. */
const writtenToday = (m: LettersMemory, now: Date): number =>
	m.written.day === localDay(now) ? m.written.count : 0;

/** Why Write is off, if it is: today's letter first, then three waiting. */
export function limitOf(
	m: LettersMemory,
	now: Date = new Date()
): WriteLimit | null {
	if (writtenToday(m, now) >= LETTERS_PER_DAY) {
		return "today";
	}
	const waiting = m.sent.filter((l) => l.status === "waiting").length;
	return waiting >= MAX_WAITING ? "three" : null;
}

/** The letter waiting to be opened, if receiving is on. */
export const unopenedOf = (m: LettersMemory): string | null =>
	m.optIn === "yes"
		? (m.received.find((l) => !(l.opened || l.hidden))?.id ?? null)
		: null;

let nextId = 0;

const patchReceived = (id: string, patch: Partial<ReceivedLetter>) =>
	set({
		received: get().received.map((l) => (l.id === id ? { ...l, ...patch } : l)),
	});

/** The calls, as the contract will take them (`backend.md` §2.3 Letters). */
export const memory = {
	acknowledge: (id: string) => patchReceived(id, { acknowledged: true }),
	hide: (id: string) => patchReceived(id, { hidden: true }),
	markSeen: (ids: readonly string[]) =>
		set({
			sent: get().sent.map((l) =>
				ids.includes(l.id) ? { ...l, seen: true } : l
			),
		}),
	open: (id: string) => patchReceived(id, { opened: true }),
	/** The letter leaves this recipient at once; the reason goes to review with it. */
	report: (id: string) =>
		set({ received: get().received.filter((l) => l.id !== id) }),
	send: (draft: Draft): SendOutcome => {
		const reason = limitOf(get());
		if (reason) {
			return { kind: "limit", reason };
		}
		nextId += 1;
		const letter: SentLetter = {
			id: `s${nextId}`,
			line: openingLine(draft.text),
			seen: true,
			status: "waiting",
		};
		const now = new Date();
		set({
			sent: [letter, ...get().sent],
			written: { count: writtenToday(get(), now) + 1, day: localDay(now) },
		});
		return { kind: "pass" };
	},
	setOptIn: (optIn: Exclude<OptIn, "unset">) => set({ optIn }),
	setPush: (push: boolean) => set({ push }),
	unhide: (id: string) => patchReceived(id, { hidden: false }),
	/** Only a waiting letter can be withdrawn; one already received says so. */
	withdraw: (id: string): "ok" | "received" => {
		const letter = get().sent.find((l) => l.id === id);
		if (letter && letter.status !== "waiting") {
			return "received";
		}
		set({ sent: get().sent.filter((l) => l.id !== id) });
		return "ok";
	},
};
