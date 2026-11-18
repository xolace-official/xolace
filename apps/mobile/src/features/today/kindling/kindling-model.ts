import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "../copy";

/** What `paths.getActive` returns when there is a kindling. */
type ActiveKindling = NonNullable<
	FunctionReturnType<typeof api.paths.getActive>
>;
type TwigKind = ActiveKindling["twigs"][number]["kind"];

/** One step on Today's path. */
export type TwigView = {
	id: string;
	/** Done and passed-by both leave the step behind; only done lights it. */
	state: "done" | "pending" | "skipped";
	title: string;
	/** How long it asks, for the NEXT and LATER eyebrows ("A FEW MINUTES"). */
	length: string;
};

/** The kindling as Today draws it: its steps in order. */
export type KindlingView = { id: string; twigs: TwigView[] };

/** The server's kindling, or none (null), as Today draws it. */
export function kindlingView(
	active: ActiveKindling | null
): KindlingView | null {
	if (!active || active.twigs.length === 0) {
		return null;
	}
	return {
		id: active._id,
		twigs: active.twigs.map((t) => {
			const kind = COPY.kindling.kinds[t.kind as TwigKind];
			return {
				id: t._id,
				length: kind.length,
				state: t.state,
				title: t.title?.trim() || kind.title,
			};
		}),
	};
}

/** Tended so far: done steps only (a step passed by isn't tended). */
export const tendedCount = (states: readonly TwigView["state"][]) =>
	states.filter((s) => s === "done").length;

/** The first step still waiting, or -1 when none is. */
export const firstWaiting = (states: readonly TwigView["state"][]) =>
	states.indexOf("pending");

/**
 * The NEXT row: the step a tap peeked at, else the first one waiting, else the whole
 * kindling's end ("ALL FOUR TENDED" when every step was tended, otherwise "done").
 */
export function nextRow(
	twigs: readonly TwigView[],
	states: readonly TwigView["state"][],
	peek: number
): { eyebrow: string; title: string } {
	const peeked = peek >= 0 ? twigs[peek] : undefined;
	if (peeked) {
		const state = states[peek];
		let eyebrow: string = COPY.kindling.passed;
		if (state === "done") {
			eyebrow = COPY.kindling.done;
		} else if (state === "pending") {
			eyebrow = COPY.kindling.later(peeked.length);
		}
		return { eyebrow, title: peeked.title };
	}
	const current = twigs[firstWaiting(states)];
	if (current) {
		return {
			eyebrow: COPY.kindling.next(current.length),
			title: current.title,
		};
	}
	const all = tendedCount(states) === twigs.length;
	return {
		eyebrow: all ? COPY.kindling.all(twigs.length) : COPY.kindling.doneEyebrow,
		title: COPY.kindling.allTitle,
	};
}

/**
 * The step to celebrate when Today comes back: one that was waiting as last shown and is
 * done now (tended on another screen), or -1. One at a time, in path order.
 */
export function newlyTended(
	shown: readonly TwigView["state"][],
	now: readonly TwigView["state"][]
): number {
	return shown.findIndex((s, i) => s !== "done" && now[i] === "done");
}

/** The path you tend, from the board's `.kpath`: 322 × 64. */
export const PATH_W = 322;
export const PATH_H = 64;
/** Room around the path for halos, pings and sparks (the board's svg overflows). */
export const PAD = 40;

type Point = readonly [number, number];
/** The board's four nodes. */
const BOARD_NODES: readonly Point[] = [
	[24, 36],
	[116, 26],
	[208, 38],
	[298, 28],
];
/** Each cubic's controls sit this far along from its ends (32 of the board's 92). */
const CONTROL = 32 / 92;

/**
 * The nodes for `count` steps (production sends 3 or 4). Four are the board's own; any
 * other count spreads the nodes evenly over the same span, keeping the board's
 * rise-and-fall heights in turn.
 */
export function nodesFor(count: number): Point[] {
	if (count === BOARD_NODES.length) {
		return BOARD_NODES.map(([x, y]) => [x, y]);
	}
	const first = BOARD_NODES[0] ?? [0, 0];
	const last = BOARD_NODES.at(-1) ?? first;
	const step = count > 1 ? (last[0] - first[0]) / (count - 1) : 0;
	return Array.from({ length: count }, (_, i) => [
		first[0] + step * i,
		BOARD_NODES[i % BOARD_NODES.length]?.[1] ?? first[1],
	]);
}

/** The stretch between two nodes as a cubic: flat out of each node, as the board draws them. */
export function cubicBetween(a: Point, b: Point): Point[] {
	const reach = (b[0] - a[0]) * CONTROL;
	return [a, [a[0] + reach, a[1]], [b[0] - reach, b[1]], b];
}

export const STROKE = {
	dash: { intervals: [4.5, 6.5], opacity: 0.42, width: 2.4 },
	glow: { blur: 3, opacity: 0.22, width: 9 },
	lit: { width: 3.4 },
	/** A 12 pt highlight runs each lit stretch every 6.4 s, seen from 6% to 30%. */
	pulse: { length: 12, opacity: 0.95, period: 6.4, width: 2.2 },
} as const;

export const NODE = {
	/** The current node breathes on a 4 s loop. */
	breathS: 4,
	check: "M-5 .5l3.4 3.4L5.2-3.6",
	dot: 4.5,
	halo: 21,
	r: 12,
	sparks: [
		[0, -24, 1.9],
		[18, -15, 1.6],
		[-18, -15, 1.6],
		[13, -27, 1.3],
		[-12, -26, 1.3],
	],
	waiting: 0.86,
} as const;

/** The completion choreography, in ms from the moment a step is tended. */
export const BEAT = {
	arrive: 500,
	arriveAt: 1300,
	check: 400,
	checkAt: 180,
	colourIn: 300,
	countAt: 150,
	dotAt: 1450,
	end: 2600,
	haloAt: 1500,
	next: 560,
	nextAt: 1350,
	ping: 950,
	pings: [1400, 1640],
	pop: 620,
	ripple: 850,
	sparks: 900,
	sparksAt: 50,
	/** Tail dots run 6% and 12% behind (60 and 120 ms). */
	tails: [60, 120],
	travel: 1100,
	travelAt: 350,
	/** The warm wash widens over 1.4 s. */
	wash: 1400,
} as const;

export const WISP = {
	r: 5,
	tails: [
		[3.5, 0.6],
		[2.5, 0.35],
	],
} as const;
