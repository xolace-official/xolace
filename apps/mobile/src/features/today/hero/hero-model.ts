import { COPY } from "../copy";
import type { Door } from "../today-model";

export const HERO = {
	bodyOutMs: 250,
	breathS: 4.8,
	chosenRim: 0.45,
	drainMs: 320,
	holdMs: 620,
	holdScale: 0.985,
	marginTop: 76,
	marginTopLate: 96,
	pad: { bottom: 18, top: 26, x: 20 },
	pressDelayMs: 120,
	radius: 34,
	releaseDelayMs: 200,
	rimBlur: 7,
	rimBlurOpacity: 0.85,
	rimFadeMs: 600,
	rimW: 2.5,
	shadow: { blur: 14, dy: 10, spread: -16 },
	slop: 10,
	tapSweepMs: 400,
	ticks: [1 / 3, 2 / 3],
} as const;

export const CARD_TOKENS = [
	"today-card-edge-late-1",
	"today-card-edge-late-2",
	"today-card-inner-1",
	"today-card-inner-2",
	"today-card-inner-late-1",
	"today-card-inner-late-2",
	"today-card-shadow",
] as const;

export const LIGHT = {
	edge: { high: 0.26, low: 0.18 },
	edgeBelow: 10,
	edgeBlur: 22,
	edgeH: 40,
	edgeInset: 40,
	edgeLate: { high: 0.18, low: 0.12 },
	inner: [
		{ blur: 0.22, dy: 0.3 },
		{ blur: 0.12, dy: 0.15 },
	],
} as const;

export const BURST = {
	backAt: 400,
	fadeUpMs: 400,
	fromScale: 0.2,
	fromY: 74,
	ms: 560,
	opaqueAt: 0.55,
	peak: 1.05,
	peakAt: 0.74,
	spread: 110,
	stagger: 60,
	tileH: 112,
	tileMinH: 88,
	tileR: 22,
	titleAt: 220,
} as const;

export const DOORS: readonly Door[] = ["talk", "vent", "sit"];

export const burstFromX = (index: number, count: number): number =>
	((count - 1) / 2 - index) * BURST.spread;

export const doorsLandMs = (count: number): number =>
	BURST.ms + BURST.stagger * Math.max(0, count - 1);

function listOf(items: readonly string[], last: string): string {
	if (items.length < 2) {
		return items[0] ?? "";
	}
	return `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`;
}

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

/** The hint line in pieces, so each door's word can wear its icon: "Talk," "Vent" "or" "Sit with this". */
export type HintPart =
	| { kind: "words"; text: string }
	| { kind: "door"; door: Door; label: string; trail: string };

export function hintParts(doors: readonly Door[]): HintPart[] {
	const parts: HintPart[] = [{ kind: "words", text: COPY.card.hintLead }];
	const last = doors.length - 1;
	for (const [i, door] of doors.entries()) {
		if (i === last && i > 0) {
			parts.push({ kind: "words", text: COPY.card.or });
		}
		parts.push({
			door,
			kind: "door",
			label: COPY.doors[door].label,
			trail: i < last - 1 ? "," : "",
		});
	}
	return parts;
}

export type HoldState = {
	phase: "rest" | "holding" | "drifted" | "chosen";
	x: number;
	y: number;
};
export type HoldEvent =
	| { type: "in"; x: number; y: number }
	| { type: "move"; x: number; y: number }
	| { type: "out" }
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

export const canChoose = (s: HoldState, a11y = false) =>
	a11y ? s.phase !== "chosen" : s.phase === "holding" || s.phase === "rest";

/** A tap opens Reflect unless the finger drifted first (onPress can land before or after onPressOut). */
export const canTap = (s: HoldState) =>
	s.phase === "holding" || s.phase === "rest";
