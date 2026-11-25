import type { PaletteName } from "@/components/xolace-face/face-palette";
import { FIRST_LOOK, type RowId, type VoiceId } from "./copy";

export const SAID_MAX = 48;
const ELLIPSIS = "…";
const TRAILING = /[\s.,;:!?…]+$/u;

/** Split into what a reader sees as characters, so a cut never halves an emoji. Hermes may
 * lack `Intl.Segmenter`; code points still never leave half a surrogate pair. */
function graphemes(text: string): string[] {
	if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
		const segmenter = new Intl.Segmenter(undefined, {
			granularity: "grapheme",
		});
		return Array.from(segmenter.segment(text), (part) => part.segment);
	}
	return Array.from(text);
}

const KEEPS_CAPITAL = /^(I(?:['’]\p{L}+)?|\p{Lu}{2,})(?![\p{Ll}])/u;

const midSentence = (words: string) =>
	KEEPS_CAPITAL.test(words)
		? words
		: `${words.charAt(0).toLocaleLowerCase()}${words.slice(1)}`;

export function saidWords(answer: string): string | null {
	const words = answer.replace(/\s+/gu, " ").replace(TRAILING, "").trim();
	if (!/[\p{L}\p{N}]/u.test(words)) {
		return null;
	}
	const chars = graphemes(words);
	if (chars.length <= SAID_MAX) {
		return midSentence(words);
	}
	const cut = chars.slice(0, SAID_MAX + 1).join("");
	const space = cut.lastIndexOf(" ");
	const head =
		space > 0 ? cut.slice(0, space) : chars.slice(0, SAID_MAX).join("");
	return midSentence(`${head.replace(TRAILING, "")}${ELLIPSIS}`);
}

const LIT_AT = 260;
const LIT_STEP = 110;
const PLUS_ROWS = FIRST_LOOK.rows.filter((r) => !r.free).length;
const LAST_LIT = LIT_AT + PLUS_ROWS * LIT_STEP;
export const HAPPY_AT = LAST_LIT + 60;
export const TALK_AT = LAST_LIT + 700;
export const ARRIVE_END = TALK_AT + 100;
export const SETTLED = 1e6;

export function litAt(i: number): number {
	"worklet";
	return LIT_AT + Math.max(1, i) * LIT_STEP;
}

export const toggled = (open: RowId | null, id: RowId): RowId | null =>
	open === id ? null : id;

export function scrollTargetFor(args: {
	contentH: number;
	next: RowId;
	nextH: number;
	prevH: number;
	viewH: number;
}): number | null {
	if (args.next === "talk") {
		return null;
	}
	return Math.max(0, args.contentH - args.prevH + args.nextH - args.viewH);
}

export const VOICE_PALETTE = {
	ash: "sea",
	flux: "brand",
	sage: "moss",
	vesper: "dusk",
	wren: "ember",
} as const satisfies Record<VoiceId, PaletteName>;
