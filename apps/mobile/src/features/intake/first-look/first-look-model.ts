// The first look's rules, pure: what "You said" quotes, when each part of the arrival lands,
// which face palette a voice gives Flux, where opening a row scrolls to, and the Talk demo's
// way on.
import type { PaletteName } from "@/components/xolace-face/face-palette";
import { type Plans, planTag } from "@/features/purchases/plans";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import { FIRST_LOOK, type RowId, type VoiceId } from "./copy";

/** Longer answers are cut at a word, so the line stays a line or two. */
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

/** "I", its contractions, and an acronym keep their capital mid-sentence. */
const KEEPS_CAPITAL = /^(I(?:['’]\p{L}+)?|\p{Lu}{2,})(?![\p{Ll}])/u;

/** Lowercased at the start, since the words sit mid-sentence after "You said". */
const midSentence = (words: string) =>
	KEEPS_CAPITAL.test(words)
		? words
		: `${words.charAt(0).toLocaleLowerCase()}${words.slice(1)}`;

/**
 * The person's own words for "You said …", or null for the plain line: nothing said
 * (skipped), or only punctuation. Whitespace collapses, the closing full stop goes (the
 * sentence goes on), the first letter is lowercased unless it's "I" or an acronym, and a long
 * answer is cut at a word with "…", counted in characters as a reader sees them.
 */
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

// ---- the arrival (the board's play()): one clock, in ms ----

/** The Plus checks land from 370 ms, 110 ms apart. */
const LIT_AT = 260;
const LIT_STEP = 110;
const PLUS_ROWS = FIRST_LOOK.rows.filter((r) => !r.free).length;
const LAST_LIT = LIT_AT + PLUS_ROWS * LIT_STEP;
/** Flux turns happy and hops once the column is lit. */
export const HAPPY_AT = LAST_LIT + 60;
/** Talk opens by itself. */
export const TALK_AT = LAST_LIT + 700;
export const ARRIVE_END = TALK_AT + 100;
/** The clock held past every part: everything settled. */
export const SETTLED = 1e6;

/** When row `i`'s Plus check lands. The free row's lands with the first. */
export function litAt(i: number): number {
	"worklet";
	return LIT_AT + Math.max(1, i) * LIT_STEP;
}

// ---- rows ----

/** Tapping a row: opens it, or closes it if it's the one open. */
export const toggled = (open: RowId | null, id: RowId): RowId | null =>
	open === id ? null : id;

/**
 * Where the middle scrolls when `next` opens (`nextH` tall) and the open row closes (`prevH`,
 * 0 if none): to its end as it will be once both have moved. Talk sits near the top, so it
 * doesn't scroll.
 */
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

// ---- voices ----

/** Flux tinted per voice, as the Talk demo tints it: Sage green, Wren warm, Vesper violet,
 * Ash cool. Flux's own voice keeps the brand. */
export const VOICE_PALETTE = {
	ash: "sea",
	flux: "brand",
	sage: "moss",
	vesper: "dusk",
	wren: "ember",
} as const satisfies Record<VoiceId, PaletteName>;

/** The Talk demo's way on (#714): it buys the plan picked on the first look, so it names that
 * plan's week or discount, and only when the store will give it. */
export const keepTalkingLabel = (plan: PlanId, plans: Plans): string => {
	const tag = planTag(plan, plans);
	return tag ? `Keep talking · ${tag}` : "Keep talking";
};
