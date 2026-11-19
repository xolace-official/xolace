/**
 * Quotes (S11), pure: what the screen shows from what Convex serves. No React, no Convex.
 *
 * Backgrounds come from the catalogue (`quoteBackgrounds.catalogue.list`, B18). Poster and
 * Night are drawn in code; other stills are bundled images keyed by catalogue key; loops are
 * hosted (a video, its first frame, maybe an ambient track). The app draws Poster whenever the
 * saved choice can't be shown: not in the catalogue (yet, or any more), or Xolace+ and the
 * account isn't.
 */
import { removeEmDash } from "@/lib/text/plain-dashes";
import { QUOTE_COPY } from "./copy";

export type Ink = "light" | "dark";
export type BackgroundKind = "still" | "loop";
/** A bundled image (`require`) or a hosted one. */
export type ImageRef = number | { uri: string };

/** One row of `catalogue.list`, as the client receives it. */
export type CatalogueRow = {
	key: string;
	name: string;
	kind: BackgroundKind;
	ink: Ink;
	plus: boolean;
	posterUrl?: string;
	videoUrl?: string;
	audioUrl?: string;
};

export type QuoteBackground = {
	key: string;
	name: string;
	kind: BackgroundKind;
	ink: Ink;
	plus: boolean;
	/** Drawn in code: Poster's wash, Night's colour. */
	drawn?: "poster" | "night";
	/** A still's image, or a loop's first frame. */
	image?: ImageRef;
	videoUrl?: string;
	audioUrl?: string;
	/** Where `cover` centres, 0..1. */
	focus?: { x: number; y: number };
};

export const POSTER: QuoteBackground = {
	drawn: "poster",
	ink: "dark",
	key: "poster",
	kind: "still",
	name: "Poster",
	plus: false,
};
const NIGHT: QuoteBackground = {
	drawn: "night",
	ink: "light",
	key: "night",
	kind: "still",
	name: "Night",
	plus: false,
};
const DRAWN: Readonly<Record<string, QuoteBackground>> = {
	night: NIGHT,
	poster: POSTER,
};

/** The board's two crops that aren't centred. */
const FOCUS: Readonly<Record<string, { x: number; y: number }>> = {
	"first-light": { x: 0.4, y: 0.5 },
	hearth: { x: 0.5, y: 1 },
};

/**
 * The sheet's backgrounds, in catalogue order: only what the catalogue lists, plus Poster, since
 * `set` refuses any other key (`unknown_background`), Night included until the deployment's
 * catalogue is uploaded. A still the app has no image for is left out (a newer catalogue than
 * this build); so is a loop with no video. Before the catalogue answers, Poster and Night, so a
 * saved Night doesn't flash Poster on the way in.
 */
export function resolveBackgrounds(
	rows: readonly CatalogueRow[] | undefined,
	stills: Readonly<Record<string, number>>
): QuoteBackground[] {
	if (!rows) {
		return [POSTER, NIGHT];
	}
	const out: QuoteBackground[] = [];
	for (const row of rows) {
		const base = {
			focus: FOCUS[row.key],
			ink: row.ink,
			key: row.key,
			kind: row.kind,
			name: row.name,
			plus: row.plus,
		};
		const drawn = DRAWN[row.key];
		if (drawn) {
			out.push({ ...drawn, name: row.name, plus: row.plus });
		} else if (row.kind === "still" && stills[row.key] !== undefined) {
			out.push({ ...base, image: stills[row.key] });
		} else if (row.kind === "loop" && row.videoUrl) {
			out.push({
				...base,
				audioUrl: row.audioUrl,
				image: row.posterUrl ? { uri: row.posterUrl } : undefined,
				videoUrl: row.videoUrl,
			});
		}
	}
	if (!out.some((b) => b.key === POSTER.key)) {
		out.unshift(POSTER);
	}
	return out;
}

/** What the screen draws for the saved choice: Poster when it can't be shown. */
export function shownBackground(
	saved: string | undefined,
	list: readonly QuoteBackground[],
	isPlus: boolean
): QuoteBackground {
	const found = list.find((b) => b.key === saved);
	if (!found || (found.plus && !isPlus)) {
		return list.find((b) => b.key === POSTER.key) ?? POSTER;
	}
	return found;
}

/** A card kept with a background: as it was, Poster if that one's gone. Never gated. */
export const keptBackground = (
	key: string | undefined,
	list: readonly QuoteBackground[]
): QuoteBackground =>
	list.find((b) => b.key === key) ??
	list.find((b) => b.key === POSTER.key) ??
	POSTER;

/** A tile tap: nothing (already on), apply it, or the Xolace+ sheet. */
export function tileTap(
	tile: QuoteBackground,
	current: string,
	isPlus: boolean
): "none" | "apply" | "plus" {
	if (tile.key === current) {
		return "none";
	}
	return tile.plus && !isPlus ? "plus" : "apply";
}

/** A loop moves unless Reduce Motion or Low Power Mode; it plays unless paused or put away. */
export function loopState(o: {
	kind: BackgroundKind;
	reduced: boolean;
	lowPower: boolean;
	paused: boolean;
	active: boolean;
	sharing: boolean;
}): { moving: boolean; playing: boolean } {
	const moving = o.kind === "loop" && !o.reduced && !o.lowPower;
	return {
		moving,
		playing: moving && !o.paused && o.active && !o.sharing,
	};
}

/** The ambient sound plays only while its loop does, and only once turned on. */
export const soundPlays = (o: {
	soundOn: boolean;
	hasAudio: boolean;
	playing: boolean;
}) => o.soundOn && o.hasAudio && o.playing;

/** The quote's type by its length: 46 / 34 / 23 pt (handoff §1). */
const SIZES = [
	{ lineHeight: 1.05, max: 40, size: 46 },
	{ lineHeight: 1.12, max: 120, size: 34 },
	{ lineHeight: 1.32, max: Number.POSITIVE_INFINITY, size: 23 },
] as const;
/** Large Text steps the quote up by 1.18, rounded. */
export const LARGE_TEXT_STEP = 1.18;

export function quoteType(
	text: string,
	fontScale: number
): { size: number; lineHeight: number } {
	const { size, lineHeight } =
		SIZES.find((s) => text.length <= s.max) ?? SIZES[2];
	return {
		lineHeight,
		size: fontScale > 1 ? Math.round(size * LARGE_TEXT_STEP) : size,
	};
}

/** Production's em dashes read as commas on the quote (#309). */
export const plainQuote = removeEmDash;

export type Reason = { text: string; gate: boolean };

/** The line under the quote. A free account that would have had its own sees the gate. */
export function reasonLine(o: {
	type: "session" | "curated";
	sessionLocked: boolean;
	hasSessionToday: boolean;
}): Reason {
	if (o.sessionLocked) {
		return { gate: true, text: QUOTE_COPY.reason.locked };
	}
	if (o.type === "session") {
		return { gate: false, text: QUOTE_COPY.reason.session };
	}
	return {
		gate: false,
		text: o.hasSessionToday
			? QUOTE_COPY.reason.curated
			: QUOTE_COPY.reason.reflectToday,
	};
}

const DAY = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
	weekday: "long",
});

/** A quote's day ("YYYY-MM-DD", UTC) as the card's chip: "Sunday 8 Nov". */
export function keptDay(date: string): string {
	const at = Date.parse(`${date}T00:00:00Z`);
	if (Number.isNaN(at)) {
		return date;
	}
	return DAY.format(at).replace(",", "");
}

/** Reflect on this seeds Reflect with a reply: never a flagged one, never over a live session. */
export function reflectSeed(o: {
	reply?: string;
	flagged: boolean;
	sessionActive: boolean;
}): string | null {
	const reply = o.reply?.trim();
	if (!reply || o.flagged || o.sessionActive) {
		return null;
	}
	return reply;
}

/** The backend's `REPLY_MAX_LENGTH`. */
export const REPLY_MAX = 500;

/** A kept quote, as Words you kept draws it. */
export type KeptCard = {
	id: string;
	/** "Sunday 8 Nov". */
	day: string;
	text: string;
	reply?: string;
	/** Its reply was flagged: shown to its writer, never seeded into Reflect. */
	flagged: boolean;
	/** The catalogue key it was kept with, if any. */
	background?: string;
};

/** A `listSaved` row (only the fields this reads). */
export type SavedRow = {
	_id: string;
	date: string;
	text: string;
	reply?: string;
	replyModeration?: { flagged: boolean };
	keptBackground?: string;
};

export const keptCard = (row: SavedRow): KeptCard => ({
	background: row.keptBackground,
	day: keptDay(row.date),
	flagged: row.replyModeration?.flagged === true,
	id: row._id,
	reply: row.reply?.trim() || undefined,
	text: plainQuote(row.text),
});

/** Cards drawn around the front one: one gone to the left, the front, two behind it. */
export const KEPT_WINDOW = { ahead: 3, behind: 1 } as const;
/** Ask for the next page when the front card is this close to the last one loaded. */
export const KEPT_PREFETCH = 3;
