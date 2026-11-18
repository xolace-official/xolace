/**
 * Moments' rules, pure: what a card and a moment show from what `sessions.listForTimeline` and
 * `sessions.getSessionDetails` send, and how the list is grouped by day. `now` is passed in.
 */
import { MOMENTS_COPY, MONTHS, WEEKDAYS } from "@/features/you/moments/copy";
import { convexErrorCode } from "@/lib/convex-error-code";

/** The tones a mirror is written in that get a chip; "adaptive" is the server's own pick and has
 * no name to show. */
export type Tone = keyof typeof MOMENTS_COPY.tones;

/** The fields of a `listForTimeline` row the list reads. */
export type MomentRow = {
	_id: string;
	createdAt: number;
	entryType: string;
	granularLabel: string | null;
	mirrorText: string;
	pathChosen: string | null;
	primaryEmotion: string | null;
	toneUsed: string | null;
};

/** The fields of `getSessionDetails` a moment reads: the session's own document, so its
 * optional fields may be missing (a session that never got past its first screen). */
export type MomentSession = {
	createdAt: number;
	entryType: string;
	granularLabel: string | null;
	primaryEmotion: string | null;
	pathChosen?: string | null;
	toneUsed?: string | null;
	mirrorText?: string | null;
	rawInput?: string | null;
	companionName?: string | null;
};

export type MomentCard = {
	id: string;
	quote: string;
	/** "Overwhelmed · sat with this". */
	line: string;
	tone: Tone | null;
};

export type ListItem =
	| { kind: "when"; id: string; when: string }
	| { kind: "moment"; id: string; moment: MomentCard; index: number };

export type MomentView = {
	/** "Today", or "Tuesday, 4 November". */
	date: string;
	/** "9:12 pm · sat with this". */
	meta: string;
	/** What you wrote; null for a talk (its thread is under the mirror) or when nothing was kept. */
	said: string | null;
	mirror: string | null;
	tone: Tone | null;
	/** The feeling, in your words' case: "overwhelmed". */
	words: string[];
	talk: boolean;
	companionName: string | null;
};

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
const NOON = 12;

export const toneOf = (tone: string | null | undefined): Tone | null =>
	tone && Object.hasOwn(MOMENTS_COPY.tones, tone) ? (tone as Tone) : null;

const spaced = (label: string) => label.replace(/-/g, " ").trim();

/** "Self-doubt" from "self-doubt"; null when the session has no feeling. */
export function feelingOf(granular: string | null, primary: string | null) {
	const label = spaced(granular ?? primary ?? "");
	return label ? label.charAt(0).toUpperCase() + label.slice(1) : null;
}

/** How the session went, in the line's lower case; null when it chose nothing. */
export function pathOf(path: string | null | undefined, entryType: string) {
	if (entryType === "talk") {
		return MOMENTS_COPY.paths.talk;
	}
	return path && Object.hasOwn(MOMENTS_COPY.paths, path)
		? MOMENTS_COPY.paths[path as keyof typeof MOMENTS_COPY.paths]
		: null;
}

const lineOf = (row: MomentRow) =>
	[
		feelingOf(row.granularLabel, row.primaryEmotion) ?? MOMENTS_COPY.reflection,
		pathOf(row.pathChosen, row.entryType),
	]
		.filter(Boolean)
		.join(" · ");

/** Production's `removeEmDash`: the mirror never shows an em dash. */
const cleanText = (text: string) =>
	text
		.replace(/\s*—\s*/g, ", ")
		.replace(/ {2}/g, " ")
		.trim();

/** Whole local days from `then` to `now`. */
const daysAgo = (then: Date, now: Date) => {
	const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
	return Math.round((a - b) / DAY_MS);
};

const dayMonth = (d: Date, now: Date) =>
	`${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`}`;

/** A section's day: Today, Yesterday, a weekday this week, else "4 November". */
export function whenOf(at: number, now: Date) {
	const d = new Date(at);
	const ago = daysAgo(d, now);
	if (ago <= 0) {
		return MOMENTS_COPY.list.today;
	}
	if (ago === 1) {
		return MOMENTS_COPY.list.yesterday;
	}
	return ago < WEEK_DAYS ? WEEKDAYS[d.getDay()] : dayMonth(d, now);
}

/** A moment's header date: Today, Yesterday, else "Tuesday, 4 November". */
export function dateOf(at: number, now: Date) {
	const d = new Date(at);
	const ago = daysAgo(d, now);
	if (ago <= 0) {
		return MOMENTS_COPY.list.today;
	}
	if (ago === 1) {
		return MOMENTS_COPY.list.yesterday;
	}
	return `${WEEKDAYS[d.getDay()]}, ${dayMonth(d, now)}`;
}

/** "9:12 pm". */
export function timeOf(at: number) {
	const d = new Date(at);
	const h = d.getHours() % NOON || NOON;
	const m = String(d.getMinutes()).padStart(2, "0");
	return `${h}:${m} ${d.getHours() < NOON ? "am" : "pm"}`;
}

export const cardOf = (row: MomentRow): MomentCard => ({
	id: row._id,
	line: lineOf(row),
	quote: cleanText(row.mirrorText),
	tone: toneOf(row.toneUsed),
});

/** Newest first, a day's label before each run of that day. `index` counts cards only. */
export function itemsOf(rows: readonly MomentRow[], now: Date): ListItem[] {
	const items: ListItem[] = [];
	let last = "";
	let index = 0;
	for (const row of rows) {
		const when = whenOf(row.createdAt, now);
		if (when !== last) {
			items.push({ id: `when-${when}`, kind: "when", when });
			last = when;
		}
		items.push({ id: row._id, index, kind: "moment", moment: cardOf(row) });
		index += 1;
	}
	return items;
}

/** The feeling words, lower case, the finer one first: ["overwhelmed", "stress"]. With no
 * feeling, "reflection" (production's "💭 Reflection" row), so a moment never ends blank. */
export function wordsOf(granular: string | null, primary: string | null) {
	const words = [granular, primary]
		.map((w) => (w ? spaced(w).toLowerCase() : ""))
		.filter(Boolean);
	return words.length > 0
		? [...new Set(words)]
		: [MOMENTS_COPY.reflection.toLowerCase()];
}

/** The codes a session read throws when it isn't yours to see: deleted (retention, a wipe), or
 * another person's (`requireSessionOwnership`). */
const MISSING_CODES: ReadonlySet<string> = new Set([
	"session_not_found",
	"session_forbidden",
]);

/**
 * A moment that isn't there: the session's reads threw that it's gone or not yours, or the id in
 * the link isn't a session's (`v.id` rejects it; the message names it outside production, which
 * keeps only "Server Error"). Anything else is a real failure.
 */
export function isMissingMoment(error: unknown) {
	const code = convexErrorCode(error);
	if (code !== undefined) {
		return MISSING_CODES.has(code);
	}
	return (
		error instanceof Error && error.message.includes("ArgumentValidationError")
	);
}

export function momentOf(s: MomentSession, now: Date): MomentView {
	const talk = s.entryType === "talk";
	const said = s.rawInput?.trim();
	return {
		companionName: s.companionName ?? null,
		date: dateOf(s.createdAt, now),
		meta: [timeOf(s.createdAt), pathOf(s.pathChosen, s.entryType)]
			.filter(Boolean)
			.join(" · "),
		mirror: s.mirrorText ? cleanText(s.mirrorText) : null,
		said: talk || !said ? null : said,
		talk,
		tone: toneOf(s.toneUsed),
		words: wordsOf(s.granularLabel, s.primaryEmotion),
	};
}
