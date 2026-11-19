import {
	caught,
	effectiveStates,
	type LocalStates,
	restingCard,
	type TrailView,
	type TwigState,
} from "./kindling-model";

/**
 * What the screen does locally before the server says so (§8): Not for me with its Undo, the
 * skip being sent, and "I did this". Pure: each step returns the new local states and what to
 * send, so `use-trail.ts` only schedules and calls.
 */
export const NO_LOCAL: LocalStates = {
	skipped: new Set(),
	tended: new Set(),
	undo: null,
};

/**
 * Why an undo window closes. `closed`: it ran out, or something that doesn't choose a card
 * (the ⋯ menu) closed it, so the card moves on. `chose`: the person opened a stop or acted,
 * so the card stays where they put it. `left`: blur, unmount or background; the skip is
 * still sent, since §8 commits it when you leave.
 */
export type CommitCause = "closed" | "chose" | "left";

export type FlowStep = {
	local: LocalStates;
	/** A skip to send now. */
	skip?: string;
	/** A tend to send now. */
	tend?: string;
	/** The card moves on to the next waiting twig. */
	moveOn?: boolean;
};

const plus = (set: ReadonlySet<string>, id: string) => new Set([...set, id]);
const minus = (set: ReadonlySet<string>, id: string) =>
	new Set([...set].filter((x) => x !== id));

/** Close the undo window, if one is open: the twig is passed and its skip is sent. */
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

/** Not for me: the twig shows passed with Undo. A skip already in its window is sent first. */
export function skipStep(l: LocalStates, id: string): FlowStep {
	const before = commitStep(l, "chose");
	return { ...before, local: { ...before.local, undo: id }, moveOn: false };
}

/** Undo: the twig waits again and nothing is sent. */
export const undoStep = (l: LocalStates): FlowStep => ({
	local: { ...l, undo: null },
});

/** A skip the server refused: the twig waits again. */
export const skipFailed = (l: LocalStates, id: string): FlowStep => ({
	local: { ...l, skipped: minus(l.skipped, id) },
});

/**
 * "I did this": tended at once and sent at once (a quick Back can't drop it). A second tap,
 * or a twig the server already has done, sends nothing.
 */
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

/** A tend the server refused: the twig waits again. */
export const tendFailed = (l: LocalStates, id: string): FlowStep => ({
	local: { ...l, tended: minus(l.tended, id) },
});

/**
 * Put it out (§11.1) while an Undo shows: the pending skip is dropped, not sent. The whole
 * kindling is going, and sending it would complete the kindling behind the alert.
 */
export const putOutStep = (l: LocalStates): FlowStep => undoStep(l);

/**
 * How many times the person has chosen a card (opened a stop, acted, skipped, undone). Each
 * move-on is scheduled with the count at that moment and lands only if nothing was chosen since,
 * so a stop they tap is never taken from them by a move-on already on its way.
 */
export type Choices = number;
export const NO_CHOICES: Choices = 0;
export const chosen = (c: Choices): Choices => c + 1;
export const moveOnLands = (scheduledAt: Choices, now: Choices) =>
	scheduledAt === now;

/** No stop held dim. */
export const NO_HOLD = -1;

/**
 * Where twig i's tend runs (§4, §5). The `last` of a batch, with nothing left waiting after it,
 * runs on into the fire. Otherwise, if the card goes to the next stop, that stop holds dim until
 * the spark lands.
 */
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

/** Whether a stop is held dim (`hold`) and a spark is on its way into the fire (`heading`, its leg). */
export type Held = { hold: number; heading: number };
export const NOT_HELD: Held = { heading: NO_HOLD, hold: NO_HOLD };

/** Twig i's tend starts: the stop after it holds dim, or its spark heads into the fire. */
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

/**
 * Twig i's spark has landed, or the server refused its tend mid-burn: what it held lets go.
 * Another tend's hold stays.
 */
export const letGo = (h: Held, i: number): Held => ({
	heading: h.heading === i ? NO_HOLD : h.heading,
	hold: h.hold === i + 1 ? NO_HOLD : h.hold,
});

/**
 * Whether twig i's tend plays now: the stop doesn't show it yet, and it is still done. One the
 * server refused in the moment before it played has gone back to waiting, and plays nothing.
 */
export const tendPlays = (
	shown: readonly TwigState[],
	now: readonly TwigState[],
	i: number
) => shown[i] !== "done" && now[i] === "done";

/** A committed skip that leaves nothing waiting: the fire catches where it is (§5), unless leaving. */
export const catchesInPlace = (
	view: TrailView,
	step: FlowStep,
	cause: CommitCause
) =>
	cause !== "left" &&
	step.skip !== undefined &&
	caught(effectiveStates(view, step.local));
