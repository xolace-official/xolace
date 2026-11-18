import { COPY } from "../copy";
import type { Door } from "../today-model";

/** The Reflect card, from the board's `.hw`, `.hero`, `.edge`, `.inglow`, `.rim`, `.choices`, `.ch*`. */
export const HERO = {
	bodyOutMs: 250,
	breathS: 4.8,
	/** The rim stays, faded, once the doors are open. */
	chosenRim: 0.45,
	drainMs: 320,
	holdMs: 620,
	/** Hold: the card dips to .985 on the Press ease. */
	holdScale: 0.985,
	marginTop: 76,
	marginTopLate: 96,
	pad: { bottom: 18, top: 26, x: 20 },
	/** A touch has to rest this long before the hold starts, so a scroll wins (habit-bubble-cluster's HOLD.delayMs). */
	pressDelayMs: 120,
	radius: 34,
	/** Once Reflect covers the card, its lit rim waits this long, then fades over drainMs. */
	releaseDelayMs: 200,
	rimBlur: 7,
	rimBlurOpacity: 0.85,
	rimFadeMs: 600,
	rimW: 2.5,
	/** The card's own shadow: 0 10px 28px -16px. */
	shadow: { blur: 14, dy: 10, spread: -16 },
	/** A finger that drifts this far from where it landed is scrolling or leaving: no hold, no tap (RN's long-press slop). */
	slop: 10,
	/** A tap: the rim runs the rest of its lap this fast, so you see it reach the whole card as Reflect opens. */
	tapSweepMs: 400,
	/** Thirds of the hold tick. */
	ticks: [1 / 3, 2 / 3],
} as const;

/** The card's fixed light (`--color-today-card-*`, global.css), in card-light's order. */
export const CARD_TOKENS = [
	"today-card-edge-late-1",
	"today-card-edge-late-2",
	"today-card-inner-1",
	"today-card-inner-2",
	"today-card-inner-late-1",
	"today-card-inner-late-2",
	"today-card-shadow",
] as const;

/** The light's geometry and breath. Tuned down in review: don't raise these. */
export const LIGHT = {
	edge: { high: 0.26, low: 0.18 },
	edgeBelow: 10,
	edgeBlur: 22,
	edgeH: 40,
	edgeInset: 40,
	edgeLate: { high: 0.18, low: 0.12 },
	/**
	 * The inner light as stacked inner shadows (ember-charge's recipe): each is the card's
	 * outline pushed up by `dy` × its height so only its lower rim shows, softened by `blur` ×
	 * height. Their colours are `--color-today-card-inner(-late)-*`.
	 */
	inner: [
		{ blur: 0.22, dy: 0.3 },
		{ blur: 0.12, dy: 0.15 },
	],
} as const;

/** Choices burst out of the hint line: from (110 pt apart, centred; +74) at .2, 1.05 at 74%, 560 ms, 60 ms apart. */
export const BURST = {
	backAt: 400,
	fadeUpMs: 400,
	fromScale: 0.2,
	fromY: 74,
	ms: 560,
	opaqueAt: 0.55,
	peak: 1.05,
	peakAt: 0.74,
	/** Between neighbouring doors' starting points (the board's ±110 for three). */
	spread: 110,
	stagger: 60,
	/** The tiles' height with room to spare; a shorter card shrinks them, down to tileMinH, so "Write instead" fits. */
	tileH: 112,
	tileMinH: 88,
	tileR: 22,
	titleAt: 220,
} as const;

/**
 * Sit with this joins the doors once Sit can start from Today on its own (`from=today`, its
 * own PR). Until then a cold Sit would wait for a session that never comes.
 */
const SIT_DOOR = false;

/** The doors a hold on the card opens, in order. */
export const DOORS: readonly Door[] = SIT_DOOR
	? ["talk", "vent", "sit"]
	: ["talk", "vent"];

/** Where door `index` of `count` starts its burst: they converge from the hint line's centre. */
export const burstFromX = (index: number, count: number): number =>
	((count - 1) / 2 - index) * BURST.spread;

/** When the last door lands, after the first starts: the Bloom plays then. */
export const doorsLandMs = (count: number): number =>
	BURST.ms + BURST.stagger * Math.max(0, count - 1);

/** "Talk", "Talk or Vent", "Talk, Vent or Sit with this". */
function listOf(items: readonly string[], last: string): string {
	if (items.length < 2) {
		return items[0] ?? "";
	}
	return `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`;
}

/** The card's hint and VoiceOver copy, named for the doors it offers. */
export function doorsCopy(doors: readonly Door[]): {
	a11yHint: string;
	action: string;
	hint: string;
} {
	const labels = doors.map((d) => COPY.doors[d].label);
	const or = listOf(labels, COPY.card.or);
	return {
		a11yHint: COPY.card.a11yHint(listOf(labels, COPY.card.and), doors.length),
		action: or,
		hint: COPY.card.hint(or),
	};
}

/**
 * The hold, as a finger sees it. `holding` from press-in; a drift past the slop makes it
 * `drifted` (the rim drains, and neither the doors nor the tap open) until the next
 * press-in; `chosen` once the doors are open, until Write instead.
 */
export type HoldState = {
	phase: "rest" | "holding" | "drifted" | "chosen";
	x: number;
	y: number;
};
export type HoldEvent =
	| { type: "in"; x: number; y: number }
	| { type: "move"; x: number; y: number }
	| { type: "out" }
	/** `a11y`: VoiceOver's doors action, which sends no touch, so a drift before it doesn't count. */
	| { type: "choose"; a11y?: boolean }
	| { type: "unchoose" };

export const HOLD_REST: HoldState = { phase: "rest", x: 0, y: 0 };

export function holdNext(s: HoldState, e: HoldEvent): HoldState {
	switch (e.type) {
		case "in":
			return s.phase === "chosen" ? s : { phase: "holding", x: e.x, y: e.y };
		case "move":
			return s.phase === "holding" &&
				Math.hypot(e.x - s.x, e.y - s.y) > HERO.slop
				? { ...s, phase: "drifted" }
				: s;
		case "out":
			return s.phase === "holding" ? { ...s, phase: "rest" } : s;
		case "choose":
			return canChoose(s, e.a11y) ? { ...s, phase: "chosen" } : s;
		case "unchoose":
			return s.phase === "chosen" ? HOLD_REST : s;
		default:
			return s;
	}
}

/**
 * The doors open from a full hold, never after a drift. VoiceOver's action opens them
 * whenever they're closed: it isn't a touch, so a finger's earlier drift doesn't bar it.
 */
export const canChoose = (s: HoldState, a11y = false) =>
	a11y ? s.phase !== "chosen" : s.phase === "holding" || s.phase === "rest";

/** A tap opens Reflect unless the finger drifted first (onPress can land before or after onPressOut). */
export const canTap = (s: HoldState) =>
	s.phase === "holding" || s.phase === "rest";
