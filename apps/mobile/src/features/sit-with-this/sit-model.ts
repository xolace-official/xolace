/**
 * Sit with this, pure: the catalogue's steps (`exercises.getForSession`) become
 * the beats the screen plays, how long each lasts, and what the screen shows
 * around them (design/handoff/sit.md §3–6, the board's `EX`, `durOf`,
 * `lengthLabel`). No React, no Convex.
 */
import type { Doc } from "@xolace/backend/convex/_generated/dataModel";
import { cycleMs } from "./clock/breath";
import { COPY } from "./copy";

export type CatalogueStep = Doc<"exercises">["steps"][number];
/** What the screen needs of an `exercises` document. */
export type CatalogueExercise = Pick<
	Doc<"exercises">,
	"_id" | "title" | "steps"
>;
/** `getForSession`'s filled slots (`mirror_line`, `user_phrase`, `user_emotion`). */
export type Slots = Readonly<Record<string, string>>;

/** Production's `TIMINGS` keys: physiological sigh, extended exhale, slow exhale. */
export type BreathPattern = "sigh" | "ext" | "slow";
export type HandIntensity = "light" | "medium" | "heavy";

export type Beat =
	| { k: "text" | "mirror"; t: string; s: number }
	| {
			k: "breath" | "sync";
			/** One line, or Make room's in-line and out-line, one per phase. */
			t: string | readonly [string, string];
			pat: BreathPattern;
			cyc: number;
	  }
	| { k: "haptic"; t: string; s: number; intensity: HandIntensity }
	| { k: "prompt"; t: string };
export type BeatKind = Beat["k"];

export type Exercise = {
	/** The catalogue document: the run restarts when it changes (a swap). */
	key: string;
	/** The catalogue's title (`let_it_land`, `reset` …). */
	id: string;
	name: string;
	beats: readonly Beat[];
};

/** Production's defaults when a step leaves them out (the old `beat-renderer.tsx`). */
const TEXT_DEFAULT_S = 8;
const HAND_DEFAULT_S = 6;
/** A hand pulse lasts long enough to feel two pulses (board `EX`: 6 s). */
const HAND_MIN_S = 6;
const BREATH_DEFAULT_CYCLES = 1;

const PATTERN: Record<
	NonNullable<CatalogueStep["breathPattern"]>,
	BreathPattern
> = {
	extended_exhale: "ext",
	physiological_sigh: "sigh",
	slow_exhale: "slow",
};

const SLOT = /\{\{(\w+)\}\}/g;

/** Production's slot fill: every slot filled, or the step's default copy. */
export function resolveContent(step: CatalogueStep, slots: Slots): string {
	const keys = step.slotKeys ?? [];
	if (keys.length === 0) {
		return step.content;
	}
	if (!keys.every((k) => slots[k] !== undefined)) {
		return step.defaultContent ?? step.content;
	}
	return step.content.replace(SLOT, (_, k: string) => slots[k] ?? "");
}

const APOSTROPHE = /(\w)'(\w)/g;
const QUOTED = /'([^']+)'/g;

/** The catalogue's straight quotes, typeset: ’ in a word, “…” around a phrase. */
export function typeset(text: string): string {
	return text.replace(APOSTROPHE, "$1’$2").replace(QUOTED, "“$1”");
}

/** One step as a beat. Mirror lines come from the user's own mirror. */
function toBeat(step: CatalogueStep, slots: Slots): Beat {
	const text = typeset(resolveContent(step, slots));
	const pat = PATTERN[step.breathPattern ?? "slow_exhale"];
	const cyc = step.breathCycles ?? BREATH_DEFAULT_CYCLES;
	switch (step.type) {
		case "breath": {
			// fix: one line per phase (Make room's in-line, then its out-line).
			const [inLine, outLine] = text.split("\n");
			const t = outLine === undefined ? text : ([inLine, outLine] as const);
			return { cyc, k: "breath", pat, t };
		}
		case "haptic":
			return {
				intensity: step.hapticIntensity ?? "medium",
				// fix: always says it.
				k: "haptic",
				s: Math.max(HAND_MIN_S, step.durationSeconds ?? HAND_DEFAULT_S),
				t: text || typeset(step.defaultContent ?? ""),
			};
		case "private_prompt":
			// fix: the question is the heading; the privacy line is said once, truthfully.
			return { k: "prompt", t: typeset(step.promptPlaceholder ?? text) };
		default: {
			if (step.syncToBreath) {
				return { cyc, k: "sync", pat, t: text };
			}
			const mirror =
				step.slotKeys?.includes("mirror_line") === true &&
				slots.mirror_line !== undefined;
			return {
				k: mirror ? "mirror" : "text",
				s: step.durationSeconds ?? TEXT_DEFAULT_S,
				t: text,
			};
		}
	}
}

/**
 * fix: the end screen says "You stayed.", so the last beat doesn't say it too
 * (Make room, Speak to it; Soften toward it's "That was kind. You stayed.").
 */
function withoutStayed(beats: Beat[]): Beat[] {
	const last = beats.at(-1);
	if (!last || (last.k !== "text" && last.k !== "mirror")) {
		return beats;
	}
	const stayed = COPY.stayed.title;
	if (!last.t.endsWith(stayed)) {
		return beats;
	}
	const rest = last.t.slice(0, -stayed.length).trim();
	return rest
		? [...beats.slice(0, -1), { ...last, t: rest }]
		: beats.slice(0, -1);
}

const exerciseName = (id: string) => COPY.names[id] ?? COPY.unnamed;

/** The catalogue entry and its slots, as the exercise the screen plays. */
export function toExercise(doc: CatalogueExercise, slots: Slots): Exercise {
	const steps = [...doc.steps].sort((a, b) => a.order - b.order);
	return {
		beats: withoutStayed(steps.map((s) => toBeat(s, slots))),
		id: doc.title,
		key: doc._id,
		name: exerciseName(doc.title),
	};
}

// --- How long each beat lasts (board `durOf`) -------------------------------

export const words = (t: string) => t.split(/\s+/).filter(Boolean);

const SHORT_LINE = 8;
const MID_LINE = 16;
/** gleam-line-intro's stagger by line length: .16, .12 or .09 s. */
export function stagger(n: number): number {
	if (n <= SHORT_LINE) {
		return 160;
	}
	return n <= MID_LINE ? 120 : 90;
}
/** gleam-line-intro's `WORD_SPAN`: each word writes in over .7 s. */
const WORD_MS = 700;
const writeMs = (n: number) => (n - 1) * stagger(n) + WORD_MS;

/** A line stays at least this long once written, plus this per word (board card 04). */
const READ_BASE_MS = 1200;
const READ_PER_WORD_MS = 320;
const MS = 1000;
/** The thread counts a prompt as 10 s; the length label counts it as 20 s. */
const PROMPT_THREAD_MS = 10_000;
const PROMPT_LENGTH_MS = 20_000;

/**
 * ms a beat lasts. A line writes in first, then stays max(the catalogue's s,
 * 1.2 s + .32 s a word), so a long mirror line isn't gone in 3 s. A prompt
 * waits for Done.
 */
export function durOf(b: Beat): number {
	switch (b.k) {
		case "text":
		case "mirror": {
			const n = words(b.t).length;
			return (
				writeMs(n) + Math.max(b.s * MS, READ_BASE_MS + READ_PER_WORD_MS * n)
			);
		}
		case "breath":
		case "sync":
			return b.cyc * cycleMs(b.pat);
		case "haptic":
			return b.s * MS;
		default:
			return Number.POSITIVE_INFINITY;
	}
}

/** Each beat's share of the thread (a prompt counts as 10 s). */
export const threadWeights = (beats: readonly Beat[]) =>
	beats.map((b) => (b.k === "prompt" ? PROMPT_THREAD_MS : durOf(b)) / MS);

const totalSeconds = (ex: Exercise) =>
	ex.beats.reduce(
		(a, b) => a + (b.k === "prompt" ? PROMPT_LENGTH_MS : durOf(b)),
		0
	) / MS;

const SECONDS_UNDER = 52;
const MINUTE_UNDER = 80;
const ROUND_S = 5;
const HALF_MINUTE = 30;

/** "About 45 seconds." (fix: the real length, not "about 90 seconds" for all). */
function lengthOf(ex: Exercise): string {
	const s = totalSeconds(ex);
	if (s < SECONDS_UNDER) {
		return COPY.length.seconds(Math.round(s / ROUND_S) * ROUND_S);
	}
	if (s < MINUTE_UNDER) {
		return COPY.length.minute;
	}
	return COPY.length.minutes(Math.round(s / HALF_MINUTE) / 2);
}

/** The first screen's line: "About a minute. Stay with it." */
export const lengthLabel = (ex: Exercise) =>
	`${lengthOf(ex)} ${COPY.length.stay}`;

/** The sheet's: "about a minute". */
export const shortLength = (ex: Exercise) =>
	lengthOf(ex).replace(/\.$/, "").replace("About ", "about ");

// --- The screen around the beats -------------------------------------------

export type Stage = "pre" | "play" | "close";
/** Where Sit was opened: a reflection's path, or a kindling twig's replay. */
export type SitFrom = "reflect" | "kindling";
/** Production allows two swaps (`exercises.recordSwap`). */
const MAX_SWAPS = 2;

export type ArcSize = "full" | "small" | "mid" | "gone";

/** The arcs never leave: small above a line, full to breathe, mid for the hand, gone to write. */
export function arcSize(stage: Stage, kind: BeatKind): ArcSize {
	if (stage === "pre") {
		return "small";
	}
	if (stage === "close") {
		return "full";
	}
	switch (kind) {
		case "breath":
		case "sync":
			return "full";
		case "haptic":
			return "mid";
		case "prompt":
			return "gone";
		default:
			return "small";
	}
}

export const isBreathing = (k: BeatKind) => k === "breath" || k === "sync";

/** Close leaves at any beat, without asking; on a kindling's first screen it goes back. */
export const closeLabel = (from: SitFrom, stage: Stage) =>
	from === "kindling" && stage === "pre" ? COPY.backToKindling : COPY.leave;

type SwapLink = {
	from: SitFrom;
	swaps: number;
	stage: Stage;
	kind: BeatKind;
	/** "Something different" has waited its 3 s of playing. */
	linkOn: boolean;
	sheetOpen: boolean;
};

/**
 * "Something different": only within a reflection (a kindling replay can't
 * swap), at most twice, never while writing or with the sheet already up. On
 * the first screen at once; while playing, after 3 s.
 */
export function canSwap(s: SwapLink): boolean {
	if (s.from !== "reflect" || s.swaps >= MAX_SWAPS || s.sheetOpen) {
		return false;
	}
	if (s.stage === "pre") {
		return true;
	}
	return s.stage === "play" && s.kind !== "prompt" && s.linkOn;
}

export type SwapChoice = { id: string; title: string; sub: string };

/**
 * The sheet's two options (`exercises.getSwapOptions`): reset, unless it's
 * already playing (fix: production would swap to the same exercise), and the
 * next best. Each with its name and real length.
 */
export function swapChoices(
	options: { reset: Exercise | null; nextBest: Exercise | null },
	currentId: string | null
): SwapChoice[] {
	const out: SwapChoice[] = [];
	const add = (ex: Exercise | null, title: string) => {
		if (ex) {
			out.push({ id: ex.key, sub: `${ex.name} · ${shortLength(ex)}`, title });
		}
	};
	if (options.reset?.id !== currentId) {
		add(options.reset, COPY.sheet.simpler);
	}
	add(options.nextBest, COPY.sheet.other);
	return out;
}
