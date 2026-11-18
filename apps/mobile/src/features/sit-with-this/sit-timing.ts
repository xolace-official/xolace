/**
 * How long each beat lasts, and the lengths said from it (board `durOf`,
 * `lengthLabel`, gleam-line-intro's stagger). Pure.
 */
import { cycleMs } from "./clock/breath";
import { COPY } from "./copy";
import type { Beat, Exercise } from "./sit-model";

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
