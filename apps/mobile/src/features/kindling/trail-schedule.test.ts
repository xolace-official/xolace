import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	MOVE_ON_MS,
	PRESS_TEND_MS,
	SETTLE_MS,
	STAGGER_MS,
	trailSchedule,
} from "./trail-schedule";

const BURN_MS = 1500;

function setup() {
	const moveCard = vi.fn();
	const fire = vi.fn();
	const played: number[] = [];
	let arrivals: ReturnType<typeof setTimeout>[] = [];
	const s = trailSchedule({
		clearTimeout: (id) => clearTimeout(id),
		moveCard,
		play: (i, last, landed) => {
			played.push(i);
			arrivals.push(
				setTimeout(() => {
					if (last) {
						fire();
					}
					landed();
				}, BURN_MS)
			);
		},
		resetTend: () => {
			for (const id of arrivals) {
				clearTimeout(id);
			}
			arrivals = [];
		},
		setTimeout: (fn, ms) => setTimeout(fn, ms),
	});
	return { fire, moveCard, played, s };
}

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("tends played on return", () => {
	it("play in trail order, 450 ms in and 300 ms apart, and the card moves on once they land", () => {
		const { moveCard, played, s } = setup();
		s.playBatch([0, 1, 2, 3]);
		vi.advanceTimersByTime(SETTLE_MS + STAGGER_MS);
		expect(played).toEqual([0, 1]);
		vi.runAllTimers();
		expect(played).toEqual([0, 1, 2, 3]);
		expect(moveCard).toHaveBeenCalled();
	});

	it("share one ticket: a stop pressed while the plays are staggered keeps its card", () => {
		const { moveCard, played, s } = setup();
		s.playBatch([0, 1, 2, 3]);
		vi.advanceTimersByTime(SETTLE_MS + STAGGER_MS / 2);
		expect(played).toEqual([0]);
		s.choose();
		vi.runAllTimers();
		expect(played).toEqual([0, 1, 2, 3]);
		expect(moveCard).not.toHaveBeenCalled();
	});

	it("found again after a choice (a skip, an Undo), the plays not started keep the batch's ticket", () => {
		const { moveCard, played, s } = setup();
		const cancel = s.playBatch([0, 1, 2, 3]);
		vi.advanceTimersByTime(SETTLE_MS + STAGGER_MS / 2);
		expect(played).toEqual([0]);
		s.choose();
		cancel();
		s.playBatch([1, 2, 3]);
		vi.runAllTimers();
		expect(played).toEqual([0, 1, 2, 3]);
		expect(moveCard).not.toHaveBeenCalled();
	});

	it("left mid-batch (a stop opened, Again, Browse), coming back plays them on a new ticket and moves the card", () => {
		const { moveCard, played, s } = setup();
		const cancel = s.playBatch([1, 2]);
		s.choose();
		cancel();
		s.blur();
		s.playBatch([1, 2]);
		vi.runAllTimers();
		expect(played).toEqual([1, 2]);
		expect(moveCard).toHaveBeenCalled();
	});

	it("a tend first found after the choice takes a new ticket, and moves the card", () => {
		const { moveCard, s } = setup();
		const cancel = s.playBatch([0]);
		vi.advanceTimersByTime(SETTLE_MS + STAGGER_MS / 2);
		s.choose();
		cancel();
		s.playBatch([3]);
		vi.runAllTimers();
		expect(moveCard).toHaveBeenCalledOnce();
	});
});

describe("I did this", () => {
	it("lights 160 ms after the press, and the card moves on once it lands", () => {
		const { moveCard, played, s } = setup();
		s.choose();
		s.press(2);
		vi.advanceTimersByTime(PRESS_TEND_MS - 1);
		expect(played).toEqual([]);
		vi.advanceTimersByTime(1 + BURN_MS + MOVE_ON_MS);
		expect(played).toEqual([2]);
		expect(moveCard).toHaveBeenCalledOnce();
	});

	it("is ticketed at the press: a stop tapped before it lights keeps its card", () => {
		const { moveCard, played, s } = setup();
		s.choose();
		s.press(2);
		vi.advanceTimersByTime(PRESS_TEND_MS / 2);
		s.choose();
		vi.runAllTimers();
		expect(played).toEqual([2]);
		expect(moveCard).not.toHaveBeenCalled();
	});
});

describe("a new kindling", () => {
	it("takes back the old trail's sparks: none lands, catches the new fire or moves the card", () => {
		const { fire, moveCard, played, s } = setup();
		s.playBatch([3]);
		vi.advanceTimersByTime(SETTLE_MS);
		expect(played).toEqual([3]);
		s.newKindling();
		vi.runAllTimers();
		expect(fire).not.toHaveBeenCalled();
		expect(moveCard).not.toHaveBeenCalled();
	});

	it("drops a move-on still waiting for the old one", () => {
		const { moveCard, s } = setup();
		s.moveOn(MOVE_ON_MS);
		s.newKindling();
		vi.runAllTimers();
		expect(moveCard).not.toHaveBeenCalled();
	});
});
