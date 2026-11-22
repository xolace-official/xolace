import { cycleMs } from "./clock/breath";
import { COPY } from "./copy";
import type { Beat, Exercise } from "./sit-model";

export const words = (t: string) => t.split(/\s+/).filter(Boolean);

const SHORT_LINE = 8;
const MID_LINE = 16;
export function stagger(n: number): number {
	if (n <= SHORT_LINE) {
		return 160;
	}
	return n <= MID_LINE ? 120 : 90;
}
const WORD_MS = 700;
const writeMs = (n: number) => (n - 1) * stagger(n) + WORD_MS;

const READ_BASE_MS = 1200;
const READ_PER_WORD_MS = 320;
const MS = 1000;
const PROMPT_THREAD_MS = 10_000;
const PROMPT_LENGTH_MS = 20_000;

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

export const lengthLabel = (ex: Exercise) =>
	`${lengthOf(ex)} ${COPY.length.stay}`;

export const shortLength = (ex: Exercise) =>
	lengthOf(ex).replace(/\.$/, "").replace("About ", "about ");
