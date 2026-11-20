import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "../copy";

type ActiveKindling = NonNullable<
	FunctionReturnType<typeof api.paths.getActive>
>;

export type TwigView = {
	id: string;
	state: "done" | "pending" | "skipped";
	title: string;
	length: string;
};

export type KindlingView = { id: string; twigs: TwigView[] };

export function kindlingView(
	active: ActiveKindling | null
): KindlingView | null {
	if (!active || active.twigs.length === 0) {
		return null;
	}
	const kinds: Partial<Record<string, { length: string; title: string }>> =
		COPY.kindling.kinds;
	return {
		id: active._id,
		twigs: active.twigs.map((t) => {
			const kind = kinds[t.kind] ?? COPY.kindling.anyKind;
			return {
				id: t._id,
				length: kind.length,
				state: t.state,
				title: t.title?.trim() || kind.title,
			};
		}),
	};
}

export const tendedCount = (states: readonly TwigView["state"][]) =>
	states.filter((s) => s === "done").length;

export const firstWaiting = (states: readonly TwigView["state"][]) =>
	states.indexOf("pending");

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

export function newlyTended(
	shown: readonly TwigView["state"][],
	now: readonly TwigView["state"][]
): number {
	return shown.findIndex((s, i) => s !== "done" && now[i] === "done");
}

type States = readonly TwigView["state"][];

export type TendShown = {
	id: string;
	key: string;
	shown: TwigView["state"][];
};

const tendKey = (id: string, now: States) => `${id}:${now.join(",")}`;

export const tendStart = (id: string, now: States): TendShown => ({
	id,
	key: tendKey(id, now),
	shown: [...now],
});

export function syncTend(
	prev: TendShown,
	id: string,
	now: States
): { next: TendShown; changed: boolean; reset: boolean } | null {
	const key = tendKey(id, now);
	if (prev.key === key) {
		return null;
	}
	if (prev.id !== id || prev.shown.length !== now.length) {
		return { changed: true, next: tendStart(id, now), reset: true };
	}
	const shown = prev.shown.map((s, i) =>
		now[i] === "done" && s !== "done" ? s : (now[i] ?? s)
	);
	const changed = shown.some((s, i) => s !== prev.shown[i]);
	return {
		changed,
		next: { id, key, shown: changed ? shown : prev.shown },
		reset: false,
	};
}

export const tendAt = (shown: States, i: number): TwigView["state"][] =>
	shown.map((s, j) => (j === i ? "done" : s));

export const TEND = {
	gapMs: 100,
	peekMs: 2600,
	settleMs: 450,
} as const;

export function tendWait(
	nowMs: number,
	busyUntil: number,
	reduced: boolean
): number {
	if (reduced) {
		return 0;
	}
	return Math.max(TEND.settleMs, busyUntil - nowMs + TEND.gapMs);
}

export type KeptKindling = {
	view: KindlingView;
	closed: boolean;
	seen: boolean;
};

type LatestKindling = FunctionReturnType<typeof api.paths.getLatest>;

export type KindlingOutcome = {
	id: string;
	completed: boolean;
	states: Partial<Record<string, TwigView["state"]>>;
} | null;

export function kindlingOutcome(latest: LatestKindling): KindlingOutcome {
	if (!latest) {
		return null;
	}
	return {
		completed: latest.status === "completed",
		id: latest._id,
		states: Object.fromEntries(latest.twigs.map((t) => [t._id, t.state])),
	};
}

const viewKey = (v: KindlingView) =>
	`${v.id}:${v.twigs.map((t) => `${t.id}=${t.state}`).join(",")}`;

export function keepKindling(
	kept: KeptKindling | null,
	server: KindlingView | null | undefined,
	outcome: KindlingOutcome | undefined,
	focused: boolean
): KeptKindling | null | undefined {
	if (server) {
		return kept && !kept.closed && viewKey(kept.view) === viewKey(server)
			? undefined
			: { closed: false, seen: false, view: server };
	}
	if (server === undefined || !kept) {
		return;
	}
	if (!kept.closed) {
		return outcome === undefined
			? undefined
			: closeKept(kept, outcome, focused);
	}
	if (focused && !kept.seen) {
		return { ...kept, seen: true };
	}
	return !focused && kept.seen ? null : undefined;
}

function closeKept(
	kept: KeptKindling,
	outcome: KindlingOutcome,
	focused: boolean
): KeptKindling | null {
	if (!outcome?.completed || outcome.id !== kept.view.id) {
		return null;
	}
	const twigs = kept.view.twigs.map((t) => ({
		...t,
		state: outcome.states[t.id] ?? t.state,
	}));
	const tended = twigs.some(
		(t, i) => t.state === "done" && kept.view.twigs[i]?.state !== "done"
	);
	return tended
		? { closed: true, seen: focused, view: { ...kept.view, twigs } }
		: null;
}

export const PATH_W = 322;
export const PATH_H = 64;
export const PAD = 40;

type Point = readonly [number, number];
const BOARD_NODES: readonly Point[] = [
	[24, 36],
	[116, 26],
	[208, 38],
	[298, 28],
];
const CONTROL = 32 / 92;

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

export function cubicBetween(a: Point, b: Point): Point[] {
	const reach = (b[0] - a[0]) * CONTROL;
	return [a, [a[0] + reach, a[1]], [b[0] - reach, b[1]], b];
}

export const STROKE = {
	dash: { intervals: [4.5, 6.5], opacity: 0.42, width: 2.4 },
	glow: { blur: 3, opacity: 0.22, width: 9 },
	lit: { width: 3.4 },
	pulse: { length: 12, opacity: 0.95, period: 6.4, width: 2.2 },
} as const;

export const NODE = {
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
	waitAlpha: 0.35,
	waiting: 0.86,
} as const;

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
	tails: [60, 120],
	travel: 1100,
	travelAt: 350,
	wash: 1400,
} as const;

export const WISP = {
	r: 5,
	tails: [
		[3.5, 0.6],
		[2.5, 0.35],
	],
} as const;
