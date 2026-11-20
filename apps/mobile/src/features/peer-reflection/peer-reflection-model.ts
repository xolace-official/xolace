import { COPY, type PeersSet } from "./copy";
import { MAX_CARDS } from "./peers-look";

export type ReflectionRow = {
	_id: string;
	displayText: string;
	resonanceCount: number;
};

export type Gone = "reported" | "hidden";

export type PeerCard = {
	id: string;
	text: string;
	others: number;
	on: boolean;
	gone: Gone | null;
};

export type Results =
	| { status: "loading" }
	| { status: "ready"; set: PeersSet; rows: ReflectionRow[] };

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

export type Ready = Extract<Results, { status: "ready" }>;

const NONE: Ready = { rows: [], set: "none", status: "ready" };

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

export const wantsRecent = (
	kept: Ready | null,
	matched: readonly unknown[] | undefined
) => kept?.set === "recent" || matched?.length === 0;

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

export const titleOf = (set: PeersSet) => COPY.sets[set];

export function announcementOf(set: PeersSet, n: number): string {
	const { rows, sub } = titleOf(set);
	const title = rows.join(" ");
	return set === "none" ? `${title} ${sub}` : COPY.announce(title, n);
}

export const bridgeShows = (distilledText: string | null | undefined) =>
	(distilledText?.trim().length ?? 0) > 0;

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
