/**
 * You're not alone, data in and what to show out. Pure: no React, no Convex.
 * Production's data flow decides which reflections show (a close match, else
 * recent ones, else none); this turns those rows into the screen's cards.
 */
import { COPY, type PeersSet } from "./copy";
import { MAX_CARDS } from "./peers-look";

/** A reflection as the screen reads it (`reflections.matchForSession`/`listRecent` rows). */
export type ReflectionRow = {
	_id: string;
	displayText: string;
	resonanceCount: number;
};

/** Reported (from the sheet) or hidden (from the hold menu): the card folds away. */
export type Gone = "reported" | "hidden";

export type PeerCard = {
	id: string;
	text: string;
	/** Everyone else who has felt it, you aside. */
	others: number;
	/** You've felt this too. */
	on: boolean;
	gone: Gone | null;
};

/** The screen's results: still loading, or a set and its rows (at most four). */
export type Results =
	| { status: "loading" }
	| { status: "ready"; set: PeersSet; rows: ReflectionRow[] };

/**
 * Production's order: the session's matches; if none, recent ones (asked for
 * only once the match comes back empty); if none, nothing yet. Loading until
 * the answer that decides is in.
 */
export function resultsOf(
	matched: readonly ReflectionRow[] | undefined,
	recent: readonly ReflectionRow[] | undefined
): Results {
	if (matched === undefined) {
		return { status: "loading" };
	}
	if (matched.length > 0) {
		return { rows: matched.slice(0, MAX_CARDS), set: "match", status: "ready" };
	}
	if (recent === undefined) {
		return { status: "loading" };
	}
	if (recent.length > 0) {
		return { rows: recent.slice(0, MAX_CARDS), set: "recent", status: "ready" };
	}
	return { rows: [], set: "none", status: "ready" };
}

/** Results that are in. */
export type Ready = Extract<Results, { status: "ready" }>;

const NONE: Ready = { rows: [], set: "none", status: "ready" };

/**
 * What the visit keeps once its results are first in. Reflections put away on
 * an earlier visit (reported or hidden this app run) are left out; if none is
 * left, it's None yet. The visit then keeps these: the arrival, each card's
 * star and a card's fold all hang on its place, so a reflection that leaves
 * the pool or a new close match never reshuffles the screen.
 */
export function firstOf(
	latest: Results,
	gone: Readonly<Record<string, Gone>>
): Ready | null {
	if (latest.status !== "ready") {
		return null;
	}
	const rows = latest.rows.filter((r) => gone[r._id] === undefined);
	return rows.length > 0 ? { ...latest, rows } : NONE;
}

/**
 * The kept cards with their live counts, by id, from every query still
 * answering (the match, and recent ones while the visit shows them).
 */
export function liveCounts(
	kept: Ready,
	...sources: (readonly ReflectionRow[] | undefined)[]
): Ready {
	const byId = new Map<string, ReflectionRow>();
	for (const rows of sources) {
		for (const r of rows ?? []) {
			byId.set(r._id, r);
		}
	}
	return { ...kept, rows: kept.rows.map((r) => byId.get(r._id) ?? r) };
}

/**
 * Production asks for recent ones only once the match comes back empty; a
 * visit showing them keeps asking, so their counts stay live after a close
 * match turns up.
 */
export const wantsRecent = (
	kept: Ready | null,
	matched: readonly unknown[] | undefined
) => kept?.set === "recent" || matched?.length === 0;

/**
 * Others who felt it: production's `resonanceCount` counts you once you have
 * (board `youLabel` takes count − 1). Read beside the server's own answer for
 * you, so an optimistic flip that moves both stays right.
 */
export function othersOf(count: number, youResonated: boolean): number {
	return Math.max(0, count - (youResonated ? 1 : 0));
}

export function cardsOf(
	rows: readonly ReflectionRow[],
	resonated: Readonly<Record<string, boolean>> | undefined,
	gone: Readonly<Record<string, Gone>>
): PeerCard[] {
	return rows.map((r) => {
		const on = resonated?.[r._id] === true;
		return {
			gone: gone[r._id] ?? null,
			id: r._id,
			on,
			others: othersOf(r.resonanceCount, on),
			text: r.displayText,
		};
	});
}

/** The title's two lines and the set's sub. */
export const titleOf = (set: PeersSet) => COPY.sets[set];

/** What VoiceOver hears once every card has landed (None yet: its title and sub). */
export function announcementOf(set: PeersSet, n: number): string {
	const { rows, sub } = titleOf(set);
	const title = rows.join(" ");
	return set === "none" ? `${title} ${sub}` : COPY.announce(title, n);
}

/**
 * The bridge to leaving yours shows only when session end will offer "Leave it
 * for someone", which it does when the session has words to share.
 */
export const bridgeShows = (distilledText: string | null | undefined) =>
	(distilledText?.trim().length ?? 0) > 0;

/** The optimistic flip: the server's answer for you, and the count with you in or out. */
export function flipped(
	resonated: Readonly<Record<string, boolean>>,
	id: string
): Record<string, boolean> {
	return { ...resonated, [id]: resonated[id] !== true };
}

export function recount<R extends ReflectionRow>(
	rows: readonly R[],
	id: string,
	on: boolean
): R[] {
	return rows.map((r) =>
		r._id === id
			? { ...r, resonanceCount: Math.max(0, r.resonanceCount + (on ? 1 : -1)) }
			: r
	);
}
