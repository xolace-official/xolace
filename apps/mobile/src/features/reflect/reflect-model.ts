import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import { ERROR_CODES, type SessionErrorCode } from "@xolace/backend/shared";
import type { PlusStatus } from "@/features/purchases/plus-status";
import { COPY } from "./copy";
import { isRateLimitMessage } from "./session/session-service";
import type { ReflectionStateName } from "./session/types";

export type ReflectStage =
	| "write"
	| "wait"
	| "land"
	| "mirror"
	| "next"
	| "heard";
export type CareStep = "main" | "res" | "breath";

const HOLDS_ARRIVALS = {
	heard: true,
	land: true,
	mirror: true,
	next: true,
	wait: true,
	write: true,
} as const satisfies Record<ReflectStage, boolean>;

export const holdsArrivals = (stage: ReflectStage): boolean =>
	HOLDS_ARRIVALS[stage];
export type Seg = readonly [text: string, pair: number];
export type MirrorLines = readonly (readonly Seg[])[];

export const SLOW_MS = 10_000;
export const MIN_WAIT_MS = 1600;
export const LAND_MS = 720;
const COUNTDOWN_FROM_MS = 30_000;
const SECOND_MS = 1000;

export function takeCountdown(remainingMs: number | null): string | null {
	if (remainingMs === null || remainingMs > COUNTDOWN_FROM_MS) {
		return null;
	}
	return `0:${String(Math.ceil(remainingMs / SECOND_MS)).padStart(2, "0")}`;
}

const WRITE_SCREENS: ReadonlySet<ReflectionStateName> = new Set([
	"idle",
	"typing",
	"typing-nudge",
]);
const MIRROR_SCREENS: ReadonlySet<ReflectionStateName> = new Set([
	"mirror",
	"escalation",
	"clarify",
	"gave-up",
]);

export function stageOf(
	screen: ReflectionStateName,
	{
		heard = false,
		landing = false,
		refining = false,
	}: { heard?: boolean; landing?: boolean; refining?: boolean } = {}
): ReflectStage {
	if (heard) {
		return "heard";
	}
	if (WRITE_SCREENS.has(screen)) {
		return "write";
	}
	if (screen === "path-selection") {
		return "next";
	}
	if (MIRROR_SCREENS.has(screen)) {
		return landing ? "land" : "mirror";
	}
	if (screen === "processing" && refining) {
		return "mirror";
	}
	return "wait";
}

export function waitStageOf(
	processingStage: "connecting" | "writing" | undefined
): number {
	if (processingStage === "writing") {
		return 2;
	}
	return processingStage === "connecting" ? 1 : 0;
}

function withoutEmDash(text: string): string {
	return text
		.replace(/\s*—\s*/g, ", ")
		.replace(/ {2}/g, " ")
		.trim();
}

const SENTENCE = /[^.!?…]+(?:[.!?…]+["”’)]*|$)/g;

export function mirrorSentences(text: string): string[] {
	const clean = withoutEmDash(text);
	return (clean.match(SENTENCE) ?? [])
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

const MIN_RUN = 3;
const MIN_CONTENT_CHARS = 4;
const SMALL = new Set([
	"about",
	"after",
	"been",
	"from",
	"have",
	"just",
	"like",
	"really",
	"that",
	"them",
	"then",
	"there",
	"they",
	"this",
	"what",
	"when",
	"with",
	"your",
]);

type Token = { word: string; start: number; end: number };

function tokens(text: string): Token[] {
	const out: Token[] = [];
	for (const m of text.matchAll(/[\p{L}\p{N}'’-]+/gu)) {
		const start = m.index ?? 0;
		out.push({
			end: start + m[0].length,
			start,
			word: m[0].toLowerCase().replace(/’/g, "'"),
		});
	}
	return out;
}

const hasContent = (run: Token[]) =>
	run.some((t) => t.word.length >= MIN_CONTENT_CHARS && !SMALL.has(t.word));

type Match = { pair: number; a: [number, number]; b: [number, number] };

function longestAt(
	mine: Token[],
	theirs: Token[],
	i: number,
	used: boolean[]
): { len: number; at: number } {
	let best = { at: -1, len: 0 };
	for (let j = 0; j < mine.length; j++) {
		let len = 0;
		while (
			i + len < theirs.length &&
			j + len < mine.length &&
			!used[j + len] &&
			theirs[i + len].word === mine[j + len].word
		) {
			len++;
		}
		if (len > best.len) {
			best = { at: j, len };
		}
	}
	return best;
}

function cut(
	text: string,
	ranges: { start: number; end: number; pair: number }[]
): Seg[] {
	const segs: Seg[] = [];
	let at = 0;
	const push = (piece: string, pair: number) => {
		if (piece) {
			segs.push([piece, pair]);
		}
	};
	for (const r of [...ranges].sort((x, y) => x.start - y.start)) {
		push(text.slice(at, r.start), -1);
		push(text.slice(r.start, r.end), r.pair);
		at = r.end;
	}
	push(text.slice(at), -1);
	return segs;
}

export function pairPhrases(
	yourWords: string,
	lines: readonly string[]
): { words: Seg[]; mirror: Seg[][] } {
	const mine = tokens(yourWords);
	const used: boolean[] = mine.map(() => false);
	const matches: Match[][] = lines.map(() => []);
	let pair = 0;
	lines.forEach((line, li) => {
		const theirs = tokens(line);
		let i = 0;
		while (i < theirs.length) {
			const { len, at } = longestAt(mine, theirs, i, used);
			const run = theirs.slice(i, i + len);
			if (len >= MIN_RUN && hasContent(run)) {
				for (let k = at; k < at + len; k++) {
					used[k] = true;
				}
				matches[li].push({
					a: [mine[at].start, mine[at + len - 1].end],
					b: [theirs[i].start, theirs[i + len - 1].end],
					pair,
				});
				pair++;
				i += len;
			} else {
				i++;
			}
		}
	});
	const words = cut(
		yourWords,
		matches.flat().map((m) => ({ end: m.a[1], pair: m.pair, start: m.a[0] }))
	);
	const mirror = lines.map((line, li) =>
		cut(
			line,
			matches[li].map((m) => ({ end: m.b[1], pair: m.pair, start: m.b[0] }))
		)
	);
	return { mirror, words };
}

const plain = (text: string): Seg[] => (text ? [[text, -1]] : []);

export const plainLines = (lines: readonly string[]): Seg[][] =>
	lines.map((l) => plain(l));

export const WRITE_IN = {
	base: 0.15,
	flashOut: 0.5,
	heavyStagger: 0.09,
	heavyWordIn: 0.6,
	lightAfter: 0.15,
	lightIn: 0.25,
	lightStagger: 0.3,
	stagger: 0.06,
	wordIn: 0.25,
} as const;
const ACTIONS_AFTER = { lit: 1.2, plain: 0.2 } as const;

export type MirrorWord = { text: string; order: number; pair: number };
export type MirrorLine = { words: MirrorWord[]; pairs: number[] };

const PUNCTUATION_ONLY = /^[^\p{L}\p{N}]+$/u;

function mirrorWords(lines: MirrorLines): MirrorLine[] {
	let order = 0;
	return lines.map((line) => {
		const words: MirrorWord[] = [];
		let joined = false;
		for (const [text, pair] of line) {
			const parts = text.split(/\s+/);
			for (const [k, w] of parts.entries()) {
				const last = words.at(-1);
				if (!w) {
					continue;
				}
				if (k === 0 && joined && last) {
					if (last.pair < 0 && pair >= 0 && PUNCTUATION_ONLY.test(last.text)) {
						last.pair = pair;
					}
					last.text += w;
				} else {
					words.push({ order, pair, text: w });
					order += 1;
				}
			}
			joined = !/\s$/.test(text);
		}
		return { pairs: line.map((s) => s[1]).filter((p) => p >= 0), words };
	});
}

export function timeline(lines: MirrorLines, heavy: boolean) {
	const words = mirrorWords(lines);
	const total = words.reduce((n, l) => n + l.words.length, 0);
	const stagger = heavy ? WRITE_IN.heavyStagger : WRITE_IN.stagger;
	const wordIn = heavy ? WRITE_IN.heavyWordIn : WRITE_IN.wordIn;
	const writeEnd = WRITE_IN.base + total * stagger + WRITE_IN.wordIn;
	const order = heavy ? [] : [...new Set(words.flatMap((l) => l.pairs))];
	const lights = order.length > 0;
	const litAt = (pair: number) =>
		writeEnd +
		WRITE_IN.lightAfter +
		Math.max(0, order.indexOf(pair)) * WRITE_IN.lightStagger;
	const lastLit = lights ? litAt(order.at(-1) ?? 0) : writeEnd;
	const settle = lights
		? lastLit + WRITE_IN.lightIn + WRITE_IN.flashOut
		: writeEnd + wordIn;
	const actionsAt =
		writeEnd + (lights ? ACTIONS_AFTER.lit : ACTIONS_AFTER.plain);
	return {
		actionsAt,
		lastLit,
		lights,
		lines: words,
		litAt,
		settle,
		stagger,
		wordIn,
		writeEnd,
	};
}

export type Timeline = ReturnType<typeof timeline>;

const SEED_CHARS = 88;

function graphemes(text: string): string[] {
	if (typeof Intl.Segmenter !== "function") {
		return Array.from(text);
	}
	const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
	return Array.from(segmenter.segment(text), (s) => s.segment);
}

function clip(text: string): string {
	const chars = graphemes(text);
	return chars.length > SEED_CHARS
		? `${chars.slice(0, SEED_CHARS).join("").trimEnd()}…`
		: text;
}

export function promptFor({
	late,
	replySeed,
	eventPrompt,
}: {
	late: boolean;
	replySeed?: string | null;
	eventPrompt?: string | null;
}): string {
	const seed = replySeed?.trim().split("\n")[0]?.trim();
	if (seed) {
		return COPY.write.replySeed(clip(seed));
	}
	if (late) {
		return COPY.write.prompt.late;
	}
	const event = eventPrompt?.trim();
	return event || COPY.write.prompt.evening;
}

export const canSend = (text: string, picks: readonly string[]) =>
	text.trim().length > 0 || picks.length > 0;

export type ResourceRow = {
	key: string;
	name: string;
	sub: string;
	kind: Resource["type"];
	href: string | null;
	a11y: string;
};

function hrefOf(r: Resource): string | null {
	switch (r.type) {
		case "phone":
			return `tel:${r.value.replace(/\s+/g, "")}`;
		case "email":
			return `mailto:${r.value}`;
		case "url":
			return r.value;
		default:
			return null;
	}
}

export function resourceRows(
	resources: readonly (string | Resource)[] | null | undefined
): ResourceRow[] {
	const rows = (resources ?? []).map((r, i): ResourceRow & { p: number } => {
		if (typeof r === "string") {
			return {
				a11y: r,
				href: null,
				key: `text-${i}`,
				kind: "text",
				name: r,
				p: Number.MAX_SAFE_INTEGER,
				sub: "",
			};
		}
		const sub = r.description ? `${r.value} · ${r.description}` : r.value;
		return {
			a11y: COPY.care.a11y[r.type](r.label, r.value),
			href: hrefOf(r),
			key: `${r.type}-${r.value}`,
			kind: r.type,
			name: r.label,
			p: r.priority,
			sub,
		};
	});
	return rows.sort((a, b) => a.p - b.p).map(({ p: _p, ...row }) => row);
}

export type WaitError = { kind: "rejected" | "limit" | "failed"; body: string };

export function waitError(
	message: string,
	plus: PlusStatus,
	code: SessionErrorCode | null = null
): WaitError {
	if (
		code === ERROR_CODES.safeguardRejected ||
		message === ERROR_CODES.safeguardRejected
	) {
		return { body: COPY.wait.rejected, kind: "rejected" };
	}
	const body = message || COPY.wait.failed;
	const limited =
		code === ERROR_CODES.reflectionRateLimited || isRateLimitMessage(message);
	if (plus === "free" && limited) {
		return { body: `${body} ${COPY.wait.limitMore}`, kind: "limit" };
	}
	return { body, kind: "failed" };
}
