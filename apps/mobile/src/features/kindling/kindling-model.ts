import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { ANY_KIND, COPY, KINDS, type KindCopy, type TintKey } from "./copy";

export type ActiveKindling = NonNullable<
	FunctionReturnType<typeof api.paths.getActive>
>;
export type ServerTwig = ActiveKindling["twigs"][number];
export type LatestKindling = FunctionReturnType<typeof api.paths.getLatest>;

export type TwigState = "wait" | "done" | "passed" | "undo";

export type TrailTwig = {
	id: string;
	kind: string;
	title: string;
	why: string;
	detail: string | null;
	trailEyebrow: string;
	cardEyebrow: string;
	action: string;
	again: string | null;
	tint: TintKey;
	browsable: boolean;
};

export type TrailView = {
	id: string;
	generatedAt: number;
	twigs: TrailTwig[];
	states: TwigState[];
};

const SERVER_STATE = {
	done: "done",
	pending: "wait",
	skipped: "passed",
} as const satisfies Record<ServerTwig["state"], TwigState>;

const EM_DASH = /\s*—\s*/g;
const DOUBLE_SPACE = / {2}/g;
const removeEmDash = (text: string) =>
	text.replace(EM_DASH, ", ").replace(DOUBLE_SPACE, " ").trim();

export const BROWSABLE = /^(audio|music)_topic_(.+)$/;

function kindCopy(kind: string): KindCopy {
	const kinds: Partial<Record<string, KindCopy>> = KINDS;
	return kinds[kind] ?? ANY_KIND;
}

export function trailView(active: ActiveKindling | null): TrailView | null {
	if (!active || active.twigs.length === 0) {
		return null;
	}
	return {
		generatedAt: active.generatedAt,
		id: active._id,
		states: active.twigs.map((t) => SERVER_STATE[t.state]),
		twigs: active.twigs.map((t) => {
			const look = kindCopy(t.kind);
			return {
				action: look.action,
				again: look.again,
				browsable: BROWSABLE.test(t.actionType),
				cardEyebrow: look.card,
				detail: t.detail?.trim() || null,
				id: t._id,
				kind: t.kind,
				tint: look.tint,
				title: t.title?.trim() || look.title,
				trailEyebrow: look.trail,
				why: removeEmDash(t.why),
			};
		}),
	};
}

export function keptView(
	active: ActiveKindling | null | undefined,
	kept: TrailView | null,
	latest: LatestKindling | undefined
): TrailView | null | undefined {
	if (active !== null) {
		return active === undefined ? (kept ?? undefined) : trailView(active);
	}
	if (!kept) {
		return null;
	}
	if (latest === undefined) {
		return kept;
	}
	if (latest?._id !== kept.id || latest.status !== "completed") {
		return null;
	}
	const byId = new Map(latest.twigs.map((t) => [t._id as string, t.state]));
	return {
		...kept,
		states: kept.twigs.map((t, i) => {
			const s = byId.get(t.id);
			return s ? SERVER_STATE[s] : (kept.states[i] ?? "wait");
		}),
	};
}

export type LocalStates = {
	undo: string | null;
	skipped: ReadonlySet<string>;
	tended: ReadonlySet<string>;
};

export function effectiveStates(view: TrailView, local: LocalStates) {
	return view.twigs.map((t, i): TwigState => {
		const server = view.states[i] ?? "wait";
		if (server !== "wait") {
			return server;
		}
		if (local.undo === t.id) {
			return "undo";
		}
		if (local.skipped.has(t.id)) {
			return "passed";
		}
		return local.tended.has(t.id) ? "done" : "wait";
	});
}

export const followStates = (
	shown: readonly TwigState[],
	now: readonly TwigState[]
): TwigState[] =>
	now.map((s, i) => {
		const was = shown[i];
		return s === "done" && was !== undefined && was !== "done" ? was : s;
	});

export const freshTends = (
	shown: readonly TwigState[],
	now: readonly TwigState[]
): number[] =>
	now.flatMap((s, i) => (s === "done" && shown[i] !== "done" ? [i] : []));

const firstWaiting = (states: readonly TwigState[]) => states.indexOf("wait");
export const tendedCount = (states: readonly TwigState[]) =>
	states.filter((s) => s === "done").length;
const passedCount = (states: readonly TwigState[]) =>
	states.filter((s) => s === "passed" || s === "undo").length;
export const settled = (states: readonly TwigState[]) =>
	states.length > 0 && !states.includes("wait") && !states.includes("undo");
export const caught = (states: readonly TwigState[]) =>
	settled(states) && tendedCount(states) > 0;

export const restingCard = (states: readonly TwigState[]) => {
	const s = firstWaiting(states);
	return s >= 0 ? s : states.length;
};

export const suggestionOf = (states: readonly TwigState[]) =>
	states.findIndex((s) => s === "wait" || s === "undo");

export function progressText(states: readonly TwigState[]) {
	const n = tendedCount(states);
	const p = passedCount(states);
	const total = states.length;
	const lit = caught(states);
	if (lit && n === total) {
		return { all: true, text: COPY.allTended(total) };
	}
	const tail = p > 0 && !lit ? COPY.passedBy(p) : "";
	return { all: false, text: COPY.progress(n, total) + tail };
}

const DAY_MS = 86_400_000;
const WEEK_DAYS = 6;
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const midnight = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

export function heldOn(generatedAt: number, now: number): string {
	const days = Math.round((midnight(now) - midnight(generatedAt)) / DAY_MS);
	if (days < 1 || days > WEEK_DAYS) {
		return COPY.lastSession;
	}
	return WEEKDAY.format(new Date(generatedAt));
}

export type CardTone = "violet" | "ember" | "quiet";
export type CardRow = "wait" | "done" | "undo" | "passed" | "all";

export function cardText(
	twigs: readonly TrailTwig[],
	states: readonly TwigState[],
	id: number
) {
	const twig = twigs[id];
	const state = states[id];
	if (!(twig && state)) {
		const n = tendedCount(states);
		const A = COPY.all;
		let eyebrow: string = A.eyebrowAll;
		if (n === 0) {
			eyebrow = A.eyebrowNone;
		} else if (passedCount(states) > 0) {
			eyebrow = A.eyebrowSome;
		}
		return {
			eyebrow,
			row: "all" as CardRow,
			title: n ? A.title : A.titleNone,
			tone: "ember" as CardTone,
			why: n ? A.body(n, states.length) : A.bodyNone,
		};
	}
	const base = { row: state as CardRow, title: twig.title, why: twig.why };
	if (state === "done") {
		return {
			...base,
			eyebrow: COPY.tendedEyebrow(twig.cardEyebrow),
			tone: "ember" as CardTone,
		};
	}
	if (state === "wait") {
		return { ...base, eyebrow: twig.cardEyebrow, tone: "violet" as CardTone };
	}
	return {
		...base,
		eyebrow: COPY.passedEyebrow(twig.cardEyebrow),
		tone: "quiet" as CardTone,
	};
}

export function stopLabel(
	twig: TrailTwig,
	index: number,
	total: number,
	state: TwigState,
	suggested: boolean
) {
	let word: string = COPY.a11y.waiting;
	if (state === "done") {
		word = COPY.a11y.tended;
	} else if (state !== "wait") {
		word = COPY.a11y.passed;
	}
	return COPY.a11y.stop(
		twig.title,
		twig.cardEyebrow,
		index + 1,
		total,
		word,
		suggested && state === "wait"
	);
}
