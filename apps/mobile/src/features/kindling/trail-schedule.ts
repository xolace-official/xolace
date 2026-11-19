import { type Choices, chosen, moveOnLands, NO_CHOICES } from "./trail-flow";

type Handle = ReturnType<typeof setTimeout>;

/** The settle before a tend plays on return, and the gap between two tends shown together. */
export const SETTLE_MS = 450;
export const STAGGER_MS = 300;
/** "I did this" lights 160 ms after the press. */
export const PRESS_TEND_MS = 160;
/** The card moves on this long after a tend lands (450) or a skip commits (500). */
export const MOVE_ON_MS = 450;
export const SKIP_MOVE_ON_MS = 500;
export const UNDO_MS = 4000;

export type ScheduleDeps = {
	setTimeout: (fn: () => void, ms: number) => Handle;
	clearTimeout: (id: Handle) => void;
	/** The card moves to where the trail rests now. */
	moveCard: () => void;
	/**
	 * Twig i's tend starts: its stop lights and its spark runs. `landed` once the spark lands
	 * (never, if the tend doesn't play or is taken back).
	 */
	play: (i: number, last: boolean, landed: () => void) => void;
	/** Everything the old trail's tends still had to draw or do (burns, landings, embers) goes. */
	resetTend: () => void;
};

/**
 * When the kindling screen does things later (§4, §7, §8): tends playing after the press or on
 * return, and the card moving on after them. Each move-on carries a ticket, taken when the tend was
 * asked for (the press, or the return that found it), and lands only if no card was chosen since:
 * a stop they tap is never taken from them by a spark already on its way. Plain timers, passed in,
 * so `use-trail.ts` only wires it to React and the tests run it on fake ones.
 */
export function trailSchedule(deps: ScheduleDeps) {
	let timers: Handle[] = [];
	let choices: Choices = NO_CHOICES;
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
		/** They chose a card (opened a stop, acted, skipped, undid): no move-on already scheduled lands. */
		choose: () => {
			choices = chosen(choices);
		},
		/** The screen is gone. */
		dispose: clear,
		moveOn,
		/** A new kindling replaced this one: nothing still pending for the old one runs. */
		newKindling: () => {
			clear();
			choices = chosen(choices);
			deps.resetTend();
		},
		/**
		 * Coming back: what was tended elsewhere plays in trail order, 450 ms in, 300 ms apart (§7),
		 * on one ticket. Returns the cancel for the plays not started yet.
		 */
		playBatch: (fresh: readonly number[]) => {
			const ticket = choices;
			const ids = fresh.map((i, n) =>
				deps.setTimeout(
					() => start(i, n === fresh.length - 1, ticket),
					SETTLE_MS + n * STAGGER_MS
				)
			);
			return () => {
				for (const id of ids) {
					deps.clearTimeout(id);
				}
			};
		},
		/** "I did this" (after `choose`): it lights after the press, and the card moves on once it lands. */
		press: (i: number) => {
			const ticket = choices;
			later(PRESS_TEND_MS, () => start(i, true, ticket));
		},
	};
}
