import { beforeEach, describe, expect, it } from "vitest";
import {
	clearSlept,
	endOfTrack,
	pickSleep,
	resetSleepTimer,
	SLEEP_FADE_S,
	SLEEP_OFF,
	type SleepChoice,
	setSleepTimer,
	sleepGain,
	sleepTimer,
	tickSleep,
} from "./sleep-timer";

/** Ticks a timer `n` seconds, collecting whether any tick paused. */
function run(start: ReturnType<typeof pickSleep>, n: number) {
	let t = start;
	let paused = 0;
	for (let i = 0; i < n; i++) {
		const step = tickSleep(t, 1);
		t = step.next;
		paused += step.pause ? 1 : 0;
	}
	return { paused, t };
}

describe("each choice", () => {
	it.each([
		[15, 900],
		[30, 1800],
		[45, 2700],
		[60, 3600],
	] as const)("%i minutes starts with %i s left", (choice, left) => {
		expect(pickSleep(choice)).toEqual({ choice, left, slept: false });
	});

	it.each(["off", "end"] as const)("%s has no countdown", (choice) => {
		expect(pickSleep(choice)).toEqual({ choice, left: 0, slept: false });
		expect(tickSleep(pickSleep(choice), 1)).toEqual({
			next: pickSleep(choice),
			pause: false,
		});
	});

	it("forgets Paused by the sleep timer when a new choice is picked", () => {
		const choices: SleepChoice[] = ["off", "end", 15, 30, 45, 60];
		for (const c of choices) {
			expect(pickSleep(c).slept).toBe(false);
		}
	});
});

describe("the tick to 0", () => {
	it("pauses exactly once, at 0, and clears the timer", () => {
		const { t, paused } = run(pickSleep(15), 900);
		expect(paused).toBe(1);
		expect(t).toEqual({ choice: "off", left: 0, slept: true });
	});

	it("keeps counting one second a tick until then", () => {
		const { t, paused } = run(pickSleep(15), 899);
		expect(paused).toBe(0);
		expect(t).toEqual({ choice: 15, left: 1, slept: false });
	});
});

describe("real time", () => {
	it("counts the time that passed, however unevenly the ticks fire", () => {
		// A throttled timer: late, early and half-second fires.
		let t = pickSleep(15);
		for (const s of [1, 2.6, 0.4, 5, 1]) {
			t = tickSleep(t, s).next;
		}
		expect(t.left).toBeCloseTo(900 - 10);
	});

	it("ends on time when a long-delayed fire overshoots 0", () => {
		const step = tickSleep({ ...pickSleep(15), left: 3 }, 30);
		expect(step).toEqual({
			next: { choice: "off", left: 0, slept: true },
			pause: true,
		});
	});

	it("ignores a fire with no time passed", () => {
		const t = pickSleep(15);
		expect(tickSleep(t, 0)).toEqual({ next: t, pause: false });
	});
});

describe("End of track", () => {
	it("clears at the natural end and says the timer paused it", () => {
		expect(endOfTrack(pickSleep("end"))).toEqual({
			choice: "off",
			left: 0,
			slept: true,
		});
	});

	it("leaves a timed choice and off alone", () => {
		const timed = pickSleep(30);
		expect(endOfTrack(timed)).toBe(timed);
		expect(endOfTrack(SLEEP_OFF)).toBe(SLEEP_OFF);
	});
});

describe("the fade", () => {
	it("is full until the last 30 s of a timed choice", () => {
		expect(sleepGain({ choice: 30, left: 1800, slept: false })).toBe(1);
		expect(
			sleepGain({ choice: 30, left: SLEEP_FADE_S + 1, slept: false })
		).toBe(1);
		expect(sleepGain(pickSleep("end"))).toBe(1);
		expect(sleepGain(SLEEP_OFF)).toBe(1);
	});

	it("falls in a straight line to 0 over the last 30 s", () => {
		for (let left = SLEEP_FADE_S; left >= 0; left--) {
			expect(sleepGain({ choice: 15, left, slept: false })).toBeCloseTo(
				left / SLEEP_FADE_S
			);
		}
	});

	it("never rises as the timer runs down", () => {
		let t = { ...pickSleep(15), left: 40 };
		let last = sleepGain(t);
		while (t.choice !== "off") {
			t = tickSleep(t, 1).next;
			if (t.choice === "off") {
				break;
			}
			const gain = sleepGain(t);
			expect(gain).toBeLessThanOrEqual(last);
			last = gain;
		}
		// The last tick before 0 is all but silent.
		expect(last).toBeCloseTo(1 / SLEEP_FADE_S);
		// Cleared at 0: the next play is at full volume.
		expect(sleepGain(t)).toBe(1);
	});
});

describe("the store", () => {
	beforeEach(resetSleepTimer);

	it("clears Paused by on the next play, and stopping clears the timer", () => {
		setSleepTimer({ choice: "off", left: 0, slept: true });
		clearSlept();
		expect(sleepTimer().slept).toBe(false);
		setSleepTimer(pickSleep(45));
		resetSleepTimer();
		expect(sleepTimer()).toEqual(SLEEP_OFF);
	});
});
