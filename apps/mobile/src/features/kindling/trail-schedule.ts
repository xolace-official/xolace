import { type Choices, chosen, moveOnLands, NO_CHOICES } from "./trail-flow";

type Handle = ReturnType<typeof setTimeout>;

export const SETTLE_MS = 450;
export const STAGGER_MS = 300;
export const PRESS_TEND_MS = 160;
export const MOVE_ON_MS = 450;
export const SKIP_MOVE_ON_MS = 500;
export const UNDO_MS = 4000;

export type ScheduleDeps = {
	setTimeout: (fn: () => void, ms: number) => Handle;
	clearTimeout: (id: Handle) => void;
	moveCard: () => void;
	play: (i: number, last: boolean, landed: () => void) => void;
	resetTend: () => void;
};

export function trailSchedule(deps: ScheduleDeps) {
	let timers: Handle[] = [];
	let choices: Choices = NO_CHOICES;
	let queued = new Map<number, Choices>();
	const later = (ms: number, fn: () => void) => {
		timers.push(deps.setTimeout(fn, ms));
	};
	const clear = () => {
		for (const id of timers) {
			deps.clearTimeout(id);
		}
		timers = [];
	};
	const moveOn = (ms: number, ticket = choices) =>
		later(ms, () => {
			if (moveOnLands(ticket, choices)) {
				deps.moveCard();
			}
		});
	const start = (i: number, last: boolean, ticket: Choices) =>
		deps.play(i, last, () => moveOn(MOVE_ON_MS, ticket));

	return {
		blur: () => {
			queued = new Map();
		},
		choose: () => {
			choices = chosen(choices);
		},
		dispose: clear,
		moveOn,
		newKindling: () => {
			clear();
			queued = new Map();
			choices = chosen(choices);
			deps.resetTend();
		},
		playBatch: (fresh: readonly number[]) => {
			const kept = queued;
			queued = new Map(fresh.map((i) => [i, kept.get(i) ?? choices]));
			const ids = fresh.map((i, n) => {
				const ticket = queued.get(i) ?? choices;
				return deps.setTimeout(
					() => {
						queued.delete(i);
						start(i, n === fresh.length - 1, ticket);
					},
					SETTLE_MS + n * STAGGER_MS
				);
			});
			return () => {
				for (const id of ids) {
					deps.clearTimeout(id);
				}
			};
		},
		press: (i: number) => {
			const ticket = choices;
			later(PRESS_TEND_MS, () => start(i, true, ticket));
		},
	};
}
