/**
 * The reader's pure rules: its copy from the entry, the body's prep, where a read opens and
 * where it's kept, minutes left and the end. No React, no Convex.
 */
import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { capitalise, RESUME_CEILING } from "@/features/lantern/lantern-model";

export type ReaderEntry = NonNullable<
	FunctionReturnType<typeof api.library.entries.getEntry>
>;
export type ReaderState = FunctionReturnType<
	typeof api.library.reads.getReaderState
>;
export type NextEntry = NonNullable<
	FunctionReturnType<typeof api.library.next.getNext>
>;
type Source = ReaderEntry["sources"][number];
type Credited = Pick<ReaderEntry, "reuse" | "sources">;

/**
 * Where a read with a stored place opens (lantern.md §5.3, open with the owner). "place":
 * production's, scrolled to the stored place. "top": at the top, with "Pick up at 40%" offered.
 * The one line to change when the owner decides.
 */
export const READ_OPENS_AT: "place" | "top" = "place";

const usable = (position: number | null | undefined) =>
	position != null && position > 0 && position < RESUME_CEILING
		? position
		: null;

/** The share to scroll to on opening, once laid out; null stays at the top. */
export const resumeOnOpen = (
	opensAt: "place" | "top",
	position: number | null | undefined
) => (opensAt === "place" ? usable(position) : null);

/** The share "Pick up at N%" offers; null shows no pill. Only a read that opens at the top. */
export const pickUpAt = (
	opensAt: "place" | "top",
	position: number | null | undefined
) => (opensAt === "top" ? usable(position) : null);

/** A place is kept only once the reader has moved this far: an untouched open never wipes one. */
export const MOVED = 60;

/** What leaving stores: the read share, 0 past the ceiling, null to keep the old place. */
export function leaveShare(y: number, maxScroll: number) {
	if (y < MOVED || maxScroll <= 0) {
		return null;
	}
	const at = Math.min(1, y / maxScroll);
	return at >= RESUME_CEILING ? 0 : at;
}

/** "4 min left": never below a minute. Runs on the UI thread too. */
export function minutesLeft(readMin: number, y: number, maxScroll: number) {
	"worklet";
	const share = Math.min(1, Math.max(0, y / maxScroll));
	return Math.max(1, Math.ceil(readMin * (1 - share)));
}

/** The end clears the article's last line above the dock, never the very bottom of the page. */
export const END_SLACK = 40;
export function endOfRead(n: {
	articleEnd: number;
	sheetTop: number;
	viewH: number;
	bottom: number;
	maxScroll: number;
}) {
	if (n.maxScroll <= 0 || n.articleEnd <= 0) {
		return Number.POSITIVE_INFINITY;
	}
	return Math.min(
		n.sheetTop + n.articleEnd - n.viewH + n.bottom,
		n.maxScroll - END_SLACK
	);
}

/** Finished needs the end reached and 30% of the read time since opening, whichever is last. */
const DWELL_SHARE = 0.3;
const MINUTE_MS = 60_000;
export const dwellLeft = (openedAt: number, readMin: number, now: number) =>
	Math.max(0, openedAt + DWELL_SHARE * readMin * MINUTE_MS - now);

const LEADING_H1 = /^#[ \t]+[^\n]*\n*/;
// enriched-markdown has no GFM admonitions (#386): the marker would render as "[!TIP]".
const ALERT_MARKER =
	/^>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/gim;

/** Stored GFM → what the renderer is handed: no leading title, callouts led by their kind. */
export function prepareBody(markdown: string) {
	return markdown
		.replace(LEADING_H1, "")
		.replace(ALERT_MARKER, (_, type: string) => `> **${capitalise(type)}**\n>`);
}

const XOLACE = "Xolace";
const XOLACE_ATTRIBUTION = "© Xolace";

/** Who this is from. Follows `reuse`, never the source count: only verbatim words carry a
 * publisher's name. */
export function headerCredit({ reuse, sources }: Credited) {
	const s: Source | undefined = sources[0];
	if (reuse === "verbatim" && s) {
		return {
			href: s.pageUrl ?? s.url,
			line: ["Published as they wrote it", s.author && `by ${s.author}`]
				.filter(Boolean)
				.join(" · "),
			logoUrl: s.logoUrl,
			name: s.name,
			xolace: false,
		};
	}
	return {
		line: reuse === "adapted" ? "Adapted by Xolace" : "Written for Lantern",
		name: XOLACE,
		xolace: true,
	};
}

/** The licence lines after the body: each once, in source order. */
export const attributionLines = (sources: readonly Source[]) =>
	sources.length
		? [...new Set(sources.map((s) => s.attributionText))]
		: [XOLACE_ATTRIBUTION];

type Meta = Pick<
	ReaderEntry,
	"kind" | "readMin" | "storyDescriptor" | "listenMin"
>;

/** "Explainer · 6 min read · 7 min listen"; a story's descriptor after its kind. */
export const metaLine = (e: Meta) =>
	[
		capitalise(e.kind),
		e.storyDescriptor,
		`${e.readMin} min read`,
		e.listenMin ? `${e.listenMin} min listen` : null,
	]
		.filter(Boolean)
		.join(" · ");

/** The meta line as VoiceOver hears it (#400): commas, and who it's from. */
export const metaLabel = (e: Meta & Credited) =>
	[
		capitalise(e.kind),
		e.storyDescriptor,
		e.reuse === "adapted"
			? `adapted by ${XOLACE}`
			: `from ${headerCredit(e).name}`,
		`${e.readMin} min read`,
		e.listenMin ? `${e.listenMin} min listen` : null,
	]
		.filter(Boolean)
		.join(", ");

/** "Reflect on this" when the curator wrote no prompt of their own (#413). */
export const REFLECT_PROMPT = "What did this bring up for you?";

const SECOND = 60;
/** "1:12". */
export const mmss = (s: number) =>
	`${Math.floor(s / SECOND)}:${String(Math.floor(s % SECOND)).padStart(2, "0")}`;
