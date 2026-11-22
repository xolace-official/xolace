import { MOMENTS_COPY, MONTHS, WEEKDAYS } from "@/features/you/moments/copy";
import { convexErrorCode } from "@/lib/convex-error-code";

export type Tone = keyof typeof MOMENTS_COPY.tones;

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
	line: string;
	tone: Tone | null;
};

export type ListItem =
	| { kind: "when"; id: string; when: string }
	| { kind: "moment"; id: string; moment: MomentCard; index: number };

export type MomentView = {
	date: string;
	meta: string;
	said: string | null;
	mirror: string | null;
	tone: Tone | null;
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

export function feelingOf(granular: string | null, primary: string | null) {
	const label = spaced(granular ?? primary ?? "");
	return label ? label.charAt(0).toUpperCase() + label.slice(1) : null;
}

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

const cleanText = (text: string) =>
	text
		.replace(/\s*—\s*/g, ", ")
		.replace(/ {2}/g, " ")
		.trim();

const daysAgo = (then: Date, now: Date) => {
	const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
	return Math.round((a - b) / DAY_MS);
};

const dayMonth = (d: Date, now: Date) =>
	`${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? "" : ` ${d.getFullYear()}`}`;

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

export function wordsOf(granular: string | null, primary: string | null) {
	const words = [granular, primary]
		.map((w) => (w ? spaced(w).toLowerCase() : ""))
		.filter(Boolean);
	return words.length > 0
		? [...new Set(words)]
		: [MOMENTS_COPY.reflection.toLowerCase()];
}

const MISSING_CODES: ReadonlySet<string> = new Set([
	"session_not_found",
	"session_forbidden",
]);

export function isMissingMoment(error: unknown) {
	const code = convexErrorCode(error);
	if (code !== undefined) {
		return MISSING_CODES.has(code);
	}
	return (
		error instanceof Error && error.message.includes("ArgumentValidationError")
	);
}

const SEED_MIN_WORDS = 3;
const SEED_MIN_CHARS = 12;

export function reflectSeed(said: string | null): string | null {
	const text = said?.trim();
	if (!text) {
		return null;
	}
	const sentence = text.split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
	const words = sentence.split(/\s+/).length;
	if (words >= SEED_MIN_WORDS && sentence.length >= SEED_MIN_CHARS) {
		return sentence;
	}
	return text.split("\n")[0]?.trim() || null;
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
