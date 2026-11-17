/**
 * Lantern's pure rules: what a card, row, hub or A–Z list shows for the data Convex serves.
 * No React, no Convex.
 */
import type { api } from "@xolace/backend/api";
import type { Doc } from "@xolace/backend/dataModel";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "@/features/lantern/copy";

export type Kind = Doc<"library_entries">["kind"];
/** An entry as every list draws it: `library.entries.listEntries`, `getHub`, `listSaved`. */
export type CardItem = FunctionReturnType<
	typeof api.library.entries.listEntries
>[number];
type Home = FunctionReturnType<typeof api.library.home.getHome>;
export type HomeHub = Home["hubs"][number];
export type Reason = Home["forYou"][number]["reason"];
export type Subject = { slug: string; count: number };

export const KINDS: readonly Kind[] = ["explainer", "advice", "story"];
export const isKind = (k: string | undefined): k is Kind =>
	KINDS.includes(k as Kind);

export const capitalise = (s: string) =>
	s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
const words = (slug: string) => slug.replace(/-/g, " ");
/** A facet slug as a name: "asking-for-help" → "Asking for help". */
export const facetLabel = (slug: string) => capitalise(words(slug));

const THOUSAND = 1000;
// Hand-rolled: Hermes' Intl lacks `notation: 'compact'` on some Android builds.
const compact = (n: number) =>
	n < THOUSAND ? `${n}` : `${(n / THOUSAND).toFixed(1).replace(/\.0$/, "")}k`;

/** Production's meta line: "6 min read · 7 min listen · 1.2k views". */
export const readTimeLine = (readMin: number, views = 0, listenMin?: number) =>
	[
		`${readMin} min read`,
		listenMin ? `${listenMin} min listen` : null,
		views > 0 ? `${compact(views)} ${views === 1 ? "view" : "views"}` : null,
	]
		.filter(Boolean)
		.join(" · ");

/** A row's kicker: "Explainer · Sleep". */
export const kickerLine = (e: Pick<CardItem, "kind" | "primarySubject">) =>
	`${capitalise(e.kind)} · ${facetLabel(e.primarySubject)}`;

/** Why For you picked an entry: "For students", "You named anxious", "Around sleep". */
export function reasonLine({ axis, slug }: Reason) {
	// Naive plural: audience slugs are simple nouns (student, parent).
	if (axis === "audience") {
		return `For ${words(slug)}s`;
	}
	if (axis === "emotion") {
		return `You named ${words(slug)}`;
	}
	return `Around ${words(slug)}`;
}

const MIN_PCT = 1;
const MAX_PCT = 99;
/** Continue's share as a whole percent; unfinished never reads as 0% or 100%. */
export const continuePct = (position: number) =>
	Math.min(MAX_PCT, Math.max(MIN_PCT, Math.round(position * 100)));

/** "6 entries · 3 to listen", then "· 2 read" on the hub's own screen once one is read. */
export function hubCountLine(n: {
	entries: number;
	listens: number;
	read?: number;
}) {
	return [
		`${n.entries} ${n.entries === 1 ? "entry" : "entries"}`,
		n.listens > 0 && `${n.listens} to listen`,
		(n.read ?? 0) > 0 && `${n.read} read`,
	]
		.filter(Boolean)
		.join(" · ");
}

/** At or past this a read is done; there's nothing to pick up (production's `RESUME_CEILING`). */
export const RESUME_CEILING = 0.98;

export type ReadMark = { kind: "read" } | { kind: "partway"; share: number };

/**
 * The mark on a row's photo (v2): finished first, then a place between 0 and the ceiling.
 * A finished entry can still carry a position (`cards.ts`), so `finished` decides.
 */
export function readMarkOf(
	e: Pick<CardItem, "finished" | "position">
): ReadMark | null {
	if (e.finished) {
		return { kind: "read" };
	}
	const p = e.position ?? 0;
	return p > 0 && p < RESUME_CEILING ? { kind: "partway", share: p } : null;
}

/** What VoiceOver appends to a row's label for its mark. */
export function readMarkLabel(mark: ReadMark | null) {
	if (!mark) {
		return "";
	}
	return mark.kind === "read"
		? COPY.row.readMark
		: COPY.row.partwayMark(Math.round(mark.share * 100));
}

/** A row's label: the title, its kicker read with a comma, and its mark. */
export const rowLabel = (e: CardItem) =>
	`${e.title}. ${kickerLine(e).replace(" · ", ", ")}${readMarkLabel(readMarkOf(e))}`;

/** Adds or removes one slug, keeping the order picked. */
export const toggleIn = (list: readonly string[], slug: string) =>
	list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];

const MINUTE = 60;
/** A track's length in whole minutes, at least 1. */
export const trackMinutes = (durationSec: number) =>
	Math.max(1, Math.round(durationSec / MINUTE));

/** Hub items in the editor's order, numbered together: reads and listens share one count. */
export type HubItem =
	| { kind: "entry"; entry: CardItem }
	| {
			kind: "audio";
			track: { slug: string; title: string; durationSec: number };
	  };

/** A hub's own count: its reads, its listens and, new in v2, how many reads are finished. */
export function hubDetailCount(items: readonly HubItem[]) {
	const entries = items.flatMap((i) => (i.kind === "entry" ? [i.entry] : []));
	return hubCountLine({
		entries: entries.length,
		listens: items.length - entries.length,
		read: entries.filter((e) => e.finished).length,
	});
}

export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const firstLetter = (slug: string) => (slug[0] ?? "").toUpperCase();
/** The letters A–Z can open: those with at least one subject. */
export const lettersWith = (subjects: readonly Subject[]) =>
	new Set(subjects.map((s) => firstLetter(s.slug)));

export type SubjectsItem =
	| { kind: "letter"; letter: string }
	| { kind: "subject"; slug: string; count: number };

/** Fixed heights, so the list jumps straight to a letter (handoff §3.3). */
export const SUBJECTS_LAYOUT = { header: 35, row: 52 } as const;

/**
 * A–Z as one flat list, so each letter can pin while its subjects scroll: the items, which of
 * them are letters, and every item's offset.
 */
export function subjectsList(subjects: readonly Subject[]) {
	const sorted = [...subjects].sort((a, b) => a.slug.localeCompare(b.slug));
	const items: SubjectsItem[] = [];
	for (const s of sorted) {
		const letter = firstLetter(s.slug);
		const last = items.at(-1);
		const lastLetter =
			last?.kind === "subject" ? firstLetter(last.slug) : last?.letter;
		if (letter !== lastLetter) {
			items.push({ kind: "letter", letter });
		}
		items.push({ count: s.count, kind: "subject", slug: s.slug });
	}
	const heights = items.map((it) =>
		it.kind === "letter" ? SUBJECTS_LAYOUT.header : SUBJECTS_LAYOUT.row
	);
	const offsets: number[] = [];
	let at = 0;
	for (const h of heights) {
		offsets.push(at);
		at += h;
	}
	const headers = items.flatMap((it, i) => (it.kind === "letter" ? [i] : []));
	return { headers, heights, items, offsets };
}

/** Where `?letter=` opens A–Z: that letter's offset, or the top. */
export function letterOffset(
	list: ReturnType<typeof subjectsList>,
	letter: string | undefined
) {
	const i = letter
		? list.items.findIndex((it) => it.kind === "letter" && it.letter === letter)
		: -1;
	return i > 0 ? list.offsets[i] : 0;
}
