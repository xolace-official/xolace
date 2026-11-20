import type { PlusStatus } from "@/features/purchases/plus-status";
import { removeEmDash } from "@/lib/text/plain-dashes";
import { QUOTE_COPY } from "./copy";

export type Ink = "light" | "dark";
export type BackgroundKind = "still" | "loop";
export type ImageRef = number | { uri: string };

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
	drawn?: "poster" | "night";
	image?: ImageRef;
	videoUrl?: string;
	audioUrl?: string;
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

const FOCUS: Readonly<Record<string, { x: number; y: number }>> = {
	"first-light": { x: 0.4, y: 0.5 },
	hearth: { x: 0.5, y: 1 },
};

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

export function shownBackground(
	saved: string | undefined,
	list: readonly QuoteBackground[],
	plus: PlusStatus
): QuoteBackground {
	const found = list.find((b) => b.key === saved);
	if (!found || (found.plus && plus === "free")) {
		return list.find((b) => b.key === POSTER.key) ?? POSTER;
	}
	return found;
}

/**
 * When a freshly mounted background layer has drawn: a gradient or flat still at once, an image
 * once it shows (it loads from disk), a playing loop on its first frame.
 */
export function readyOn(
	b: QuoteBackground,
	play: boolean
): "now" | "image" | "frame" {
	if (b.kind === "loop" && play && b.videoUrl !== undefined) {
		return "frame";
	}
	return b.image === undefined ? "now" : "image";
}

export const keptBackground = (
	key: string | undefined,
	list: readonly QuoteBackground[]
): QuoteBackground =>
	list.find((b) => b.key === key) ??
	list.find((b) => b.key === POSTER.key) ??
	POSTER;

export function tileTap(
	tile: QuoteBackground,
	current: string,
	plus: PlusStatus
): "none" | "apply" | "plus" | "wait" {
	if (tile.key === current) {
		return "none";
	}
	if (!tile.plus || plus === "plus") {
		return "apply";
	}
	return plus === "free" ? "plus" : "wait";
}

export const loopsMayMove = (o: { reduced: boolean; lowPower: boolean }) =>
	!(o.reduced || o.lowPower);

export function loopState(o: {
	kind: BackgroundKind;
	reduced: boolean;
	lowPower: boolean;
	paused: boolean;
	active: boolean;
	sharing: boolean;
}): { moving: boolean; playing: boolean } {
	const moving = o.kind === "loop" && loopsMayMove(o);
	return {
		moving,
		playing: moving && !o.paused && o.active && !o.sharing,
	};
}

export function numberWords(
	lines: readonly string[]
): { index: number; word: string }[][] {
	let next = 0;
	return lines.map((line) =>
		line.split(" ").map((word) => {
			const index = next;
			next += 1;
			return { index, word };
		})
	);
}

export const soundPlays = (o: {
	soundOn: boolean;
	hasAudio: boolean;
	playing: boolean;
}) => o.soundOn && o.hasAudio && o.playing;

const SIZES = [
	{ lineHeight: 1.05, max: 40, size: 46 },
	{ lineHeight: 1.12, max: 120, size: 34 },
	{ lineHeight: 1.32, max: Number.POSITIVE_INFINITY, size: 23 },
] as const;
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

export const plainQuote = removeEmDash;

export type Reason = { text: string; gate: boolean };

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

export function keptDay(date: string): string {
	const at = Date.parse(`${date}T00:00:00Z`);
	if (Number.isNaN(at)) {
		return date;
	}
	return DAY.format(at).replace(",", "");
}

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

export type KeptCard = {
	id: string;
	day: string;
	text: string;
	reply?: string;
	flagged: boolean;
	background?: string;
};

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

export const KEPT_WINDOW = { ahead: 3, behind: 1 } as const;
export const KEPT_PREFETCH = 3;
