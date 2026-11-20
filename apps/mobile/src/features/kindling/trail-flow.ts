import {
	caught,
	effectiveStates,
	type LocalStates,
	restingCard,
	type TrailView,
	type TwigState,
} from "./kindling-model";

export const NO_LOCAL: LocalStates = {
	skipped: new Set(),
	tended: new Set(),
	undo: null,
};

export type CommitCause = "closed" | "chose" | "left";

export type FlowStep = {
	local: LocalStates;
	skip?: string;
	tend?: string;
	moveOn?: boolean;
};

const plus = (set: ReadonlySet<string>, id: string) => new Set([...set, id]);
const minus = (set: ReadonlySet<string>, id: string) =>
	new Set([...set].filter((x) => x !== id));

export function commitStep(l: LocalStates, cause: CommitCause): FlowStep {
	const id = l.undo;
	if (!id) {
		return { local: l };
	}
	return {
		local: { ...l, skipped: plus(l.skipped, id), undo: null },
		moveOn: cause === "closed",
		skip: id,
	};
}

export function skipStep(l: LocalStates, id: string): FlowStep {
	const before = commitStep(l, "chose");
	return { ...before, local: { ...before.local, undo: id }, moveOn: false };
}

export const undoStep = (l: LocalStates): FlowStep => ({
	local: { ...l, undo: null },
});

export const skipFailed = (l: LocalStates, id: string): FlowStep => ({
	local: { ...l, skipped: minus(l.skipped, id) },
});

export function tendStep(
	l: LocalStates,
	id: string,
	alreadyDone: boolean
): FlowStep {
	if (alreadyDone || l.tended.has(id)) {
		return { local: l };
	}
	return { local: { ...l, tended: plus(l.tended, id) }, tend: id };
}

export const tendFailed = (l: LocalStates, id: string): FlowStep => ({
	local: { ...l, tended: minus(l.tended, id) },
});

export const putOutStep = (l: LocalStates): FlowStep => undoStep(l);

export type Choices = number;
export const NO_CHOICES: Choices = 0;
export const chosen = (c: Choices): Choices => c + 1;
export const moveOnLands = (scheduledAt: Choices, now: Choices) =>
	scheduledAt === now;

export const NO_HOLD = -1;

export function tendRun(
	now: readonly TwigState[],
	i: number,
	last: boolean
): { after: TwigState[]; toFire: boolean; hold: number } {
	const after = now.map((s, j) => (j === i ? "done" : s));
	const toFire = last && caught(after);
	const hold = !toFire && restingCard(after) === i + 1 ? i + 1 : NO_HOLD;
	return { after, hold, toFire };
}

export type Held = { hold: number; heading: number };
export const NOT_HELD: Held = { heading: NO_HOLD, hold: NO_HOLD };

export const holdFor = (
	h: Held,
	i: number,
	run: ReturnType<typeof tendRun>
): Held => {
	if (run.toFire) {
		return { ...h, heading: i };
	}
	return run.hold === NO_HOLD ? h : { ...h, hold: run.hold };
};

export const letGo = (h: Held, i: number): Held => ({
	heading: h.heading === i ? NO_HOLD : h.heading,
	hold: h.hold === i + 1 ? NO_HOLD : h.hold,
});

export const tendPlays = (
	shown: readonly TwigState[],
	now: readonly TwigState[],
	i: number
) => shown[i] !== "done" && now[i] === "done";

export const catchesInPlace = (
	view: TrailView,
	step: FlowStep,
	cause: CommitCause
) =>
	cause !== "left" &&
	step.skip !== undefined &&
	caught(effectiveStates(view, step.local));
