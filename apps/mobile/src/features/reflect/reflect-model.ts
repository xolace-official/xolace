/**
 * Reflect as pure functions: which stage production's session machine is on, the mirror cut
 * into lines, the phrases it borrowed from your words, its write-in timeline, the wait's line,
 * the question and the escalation list. No React, no Convex: the data hook and the dev states'
 * fixtures both feed these.
 */
import type { Resource } from "@xolace/backend/convex/lib/crisisResources";
import { COPY } from "./copy";
import { isRateLimitMessage } from "./session/session-service";
import type { ReflectionStateName } from "./session/types";

/** The board's stages: write → wait → land → mirror → next → heard. */
export type ReflectStage =
	| "write"
	| "wait"
	| "land"
	| "mirror"
	| "next"
	| "heard";
export type CareStep = "main" | "res" | "breath";
/** A run of text and the phrase pair it belongs to (−1: plain). */
export type Seg = readonly [text: string, pair: number];
/** The mirror, line by line, each a run of segments. */
export type MirrorLines = readonly (readonly Seg[])[];

/** Production's MAX_TURNS: two refinements, then "Leave it here". */
export const MAX_TURNS = 2;
/** The slow card shows after this long in the wait (handoff §5.4: 10 s, not the board's 9). */
export const SLOW_MS = 10_000;
/** A quick answer still waits this long, so the circle always plays its close (S25). */
export const MIN_WAIT_MS = 1600;
/** The circle closes (.42 s) and bleeds before the mirror takes the stage. */
export const LAND_MS = 720;
/** Production's MAX_RAW_INPUT: the server refuses more. */
export const MAX_CHARS = 5000;

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

/**
 * The stage for the machine's screen. `heard` holds Heard after the exit completes (the machine
 * resets then); `landing` is the circle's close between the answer and the mirror; `refining`
 * keeps a refinement's processing on the mirror, which shimmers until the new one lands.
 */
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

/** The wait's line, from the server's `processingStage` (absent: still reading the input). */
export function waitStageOf(
	processingStage: "connecting" | "writing" | undefined
): number {
	if (processingStage === "writing") {
		return 2;
	}
	return processingStage === "connecting" ? 1 : 0;
}

/** Production's `removeEmDash`: the mirror never shows an em dash. */
function withoutEmDash(text: string): string {
	return text
		.replace(/\s*—\s*/g, ", ")
		.replace(/ {2}/g, " ")
		.trim();
}

const SENTENCE = /[^.!?…]+(?:[.!?…]+["”’)]*|$)/g;

/** The mirror, one sentence a line, as the board sets it. */
export function mirrorSentences(text: string): string[] {
	const clean = withoutEmDash(text);
	return (clean.match(SENTENCE) ?? [])
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/** A borrowed phrase is at least this many words in a row… */
const MIN_RUN = 3;
/** …with at least one that isn't small. */
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

/** The longest run starting at mirror token `i` that your words also hold, unused so far. */
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

/**
 * Cut `text` into segments at the matched character ranges. The segments keep their spaces, so
 * joined they give back `text`.
 */
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

/**
 * The phrases the mirror borrowed from your words (S7, S8): runs of at least three words the
 * mirror repeats, each paired with where you said it. The backend doesn't say which phrase a
 * line borrowed, so only words it kept as you wrote them light; a paraphrase stays plain.
 */
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

/** Plain text as one unpaired run (Your words before a mirror, or one with nothing borrowed). */
const plain = (text: string): Seg[] => (text ? [[text, -1]] : []);

/** Mirror lines with nothing lit (a heavy mirror, a revised one). */
export const plainLines = (lines: readonly string[]): Seg[][] =>
	lines.map((l) => plain(l));

/** S7 ember-glow-story on the board's numbers, in seconds from the landing. */
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
/** Board `actDelay`: the actions come after the lighting, or just after the writing. */
const ACTIONS_AFTER = { lit: 1.2, plain: 0.2 } as const;

export type MirrorWord = { text: string; order: number; pair: number };
export type MirrorLine = { words: MirrorWord[]; pairs: number[] };

/**
 * The mirror's words in write-in order, with the pairs each line lights. Text that follows a
 * phrase with no space ("said" then ".") stays on that phrase's last word.
 */
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

/**
 * The mirror's timeline: word i shows at .15 + .06·i over .25 s; .15 s after the last word the
 * borrowed phrases light .3 s apart, in the order the mirror uses them. Heavy: .09 s apart,
 * .6 s each, nothing lights. The clock settles once the last halo has faded.
 */
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

/** Production's `SEED_CHARS`: a quote-reply seed is clipped to this many characters. */
const SEED_CHARS = 88;

function clip(text: string): string {
	const chars = Array.from(text);
	return chars.length > SEED_CHARS
		? `${chars.slice(0, SEED_CHARS).join("").trimEnd()}…`
		: text;
}

/**
 * The question over the field, in production's order (`resolve-card-content.ts`): a quote-reply
 * seed (#316), then the late question, then a month's prompt, then the evening question. The
 * seed only seeds the screen, never the words sent.
 */
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

/** Let it out takes words or a picked feeling. */
export const canSend = (text: string, picks: readonly string[]) =>
	text.trim().length > 0 || picks.length > 0;

/** One row of the escalation list, from the session's resources. */
export type ResourceRow = {
	key: string;
	name: string;
	sub: string;
	kind: Resource["type"];
	/** What opening it does (`tel:`, `mailto:`, a link); null for text you read. */
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

/** The session's escalation resources, crisis lines first (lower priority shows first). */
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

/** The safeguard's rejection code (convex/ai/safeguard.ts). */
const REJECTED_CODE = "content_policy_violation";

/**
 * Why the send failed, as the wait's card tells it. `rejected`: the safeguard said no, so a
 * retry would only fail again and the card offers support. `limit`: a free account hit the
 * hourly cap, so the card opens Plus. `failed`: anything else, with production's message.
 */
export type WaitError = { kind: "rejected" | "limit" | "failed"; body: string };

export function waitError(message: string, isPlus: boolean): WaitError {
	if (message === REJECTED_CODE) {
		return { body: COPY.wait.rejected, kind: "rejected" };
	}
	const body = message || COPY.wait.failed;
	if (!isPlus && isRateLimitMessage(message)) {
		return { body: `${body} ${COPY.wait.limitMore}`, kind: "limit" };
	}
	return { body, kind: "failed" };
}
