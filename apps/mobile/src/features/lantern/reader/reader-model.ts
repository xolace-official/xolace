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

export const READ_OPENS_AT: "place" | "top" = "place";

const usable = (position: number | null | undefined) =>
	position != null && position > 0 && position < RESUME_CEILING
		? position
		: null;

export const resumeOnOpen = (
	opensAt: "place" | "top",
	position: number | null | undefined
) => (opensAt === "place" ? usable(position) : null);

export const pickUpAt = (
	opensAt: "place" | "top",
	position: number | null | undefined
) => (opensAt === "top" ? usable(position) : null);

export const MOVED = 60;

export function leaveShare(y: number, maxScroll: number) {
	if (y < MOVED || maxScroll <= 0) {
		return null;
	}
	const at = Math.min(1, y / maxScroll);
	return at >= RESUME_CEILING ? 0 : at;
}

export function placeKeeper() {
	let share: number | null = null;
	return {
		arm(y: number, maxScroll: number) {
			share = maxScroll > 0 ? Math.min(1, Math.max(0, y / maxScroll)) : null;
		},
		settle() {
			share = null;
		},
		sized(maxScroll: number) {
			if (share === null) {
				return null;
			}
			const to = share * maxScroll;
			share = null;
			return to;
		},
	};
}

export function minutesLeft(readMin: number, y: number, maxScroll: number) {
	"worklet";
	const share = Math.min(1, Math.max(0, y / maxScroll));
	return Math.max(1, Math.ceil(readMin * (1 - share)));
}

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

const DWELL_SHARE = 0.3;
const MINUTE_MS = 60_000;
export const dwellLeft = (openedAt: number, readMin: number, now: number) =>
	Math.max(0, openedAt + DWELL_SHARE * readMin * MINUTE_MS - now);

const LEADING_H1 = /^#[ \t]+[^\n]*\n*/;
const ALERT_MARKER =
	/^>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*$/gim;

export function prepareBody(markdown: string) {
	return markdown
		.replace(LEADING_H1, "")
		.replace(ALERT_MARKER, (_, type: string) => `> **${capitalise(type)}**\\`);
}

const XOLACE = "Xolace";
const XOLACE_ATTRIBUTION = "© Xolace";

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

export function creditMark(credit: { name: string; xolace: boolean }) {
	if (credit.xolace) {
		return "x";
	}
	return (credit.name.match(/[A-Za-z0-9]/)?.[0] ?? "").toUpperCase();
}

export const attributionLines = (sources: readonly Source[]) =>
	sources.length
		? [...new Set(sources.map((s) => s.attributionText))]
		: [XOLACE_ATTRIBUTION];

type Meta = Pick<
	ReaderEntry,
	"kind" | "readMin" | "storyDescriptor" | "listenMin"
>;

export const metaLine = (e: Meta) =>
	[
		capitalise(e.kind),
		e.storyDescriptor,
		`${e.readMin} min read`,
		e.listenMin ? `${e.listenMin} min listen` : null,
	]
		.filter(Boolean)
		.join(" · ");

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

export const REFLECT_PROMPT = "What did this bring up for you?";

const SECOND = 60;
export const mmss = (s: number) =>
	`${Math.floor(s / SECOND)}:${String(Math.floor(s % SECOND)).padStart(2, "0")}`;
