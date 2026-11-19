import { describe, expect, it } from "vitest";
import {
	flushProgress,
	PROGRESS_EVERY_MS,
	type ProgressTick,
	type ProgressTracker,
	startProgress,
	tickProgress,
} from "./progress-tracker";

const tick = (over: Partial<ProgressTick>): ProgressTick => ({
	currentTime: 0,
	didJustFinish: false,
	durationSec: 600,
	family: "support",
	now: 0,
	playing: true,
	...over,
});

/** Runs ticks in order and returns every write. */
function run(ticks: Partial<ProgressTick>[], from = startProgress()) {
	let tracker: ProgressTracker = from;
	const writes: unknown[] = [];
	for (const t of ticks) {
		const next = tickProgress(tracker, tick(t));
		tracker = next.tracker;
		if (next.write) {
			writes.push(next.write);
		}
	}
	return { tracker, writes };
}

describe("tickProgress", () => {
	it("doesn't write when a play starts", () => {
		expect(run([{ currentTime: 0, now: 0 }]).writes).toEqual([]);
	});

	it("writes every 15 s while it plays", () => {
		const { writes } = run([
			{ currentTime: 0, now: 0 },
			{ currentTime: 10, now: 10_000 },
			{ currentTime: 15, now: PROGRESS_EVERY_MS },
			{ currentTime: 20, now: 20_000 },
			{ currentTime: 30, now: 30_000 },
		]);
		expect(writes).toEqual([{ positionSec: 15 }, { positionSec: 30 }]);
	});

	it("writes on pause, once", () => {
		const { writes } = run([
			{ currentTime: 40, now: 0 },
			{ currentTime: 42, now: 2000, playing: false },
			{ currentTime: 42, now: 60_000, playing: false },
		]);
		expect(writes).toEqual([{ positionSec: 42 }]);
	});

	it("counts the 15 s again from a resume, not from before the pause", () => {
		const { writes } = run([
			{ currentTime: 0, now: 0 },
			{ currentTime: 5, now: 5000, playing: false },
			{ currentTime: 5, now: 100_000 },
			{ currentTime: 10, now: 105_000 },
		]);
		expect(writes).toEqual([{ positionSec: 5 }]);
	});

	it("writes a natural finish once, with finished", () => {
		const { writes } = run([
			{ currentTime: 598, now: 0 },
			{ currentTime: 600, didJustFinish: true, now: 2000, playing: false },
			{ currentTime: 600, didJustFinish: true, now: 3000, playing: false },
		]);
		expect(writes).toEqual([{ finished: true, positionSec: 600 }]);
	});

	it("never writes music", () => {
		const { writes } = run([
			{ family: "music", now: 0 },
			{ currentTime: 30, family: "music", now: 30_000 },
			{ currentTime: 31, family: "music", now: 31_000, playing: false },
			{ didJustFinish: true, family: "music", now: 40_000, playing: false },
		]);
		expect(writes).toEqual([]);
	});
});

describe("flushProgress", () => {
	it("writes the last place of a support track still playing", () => {
		const { tracker } = run([{ currentTime: 0 }, { currentTime: 12, now: 12 }]);
		expect(flushProgress(tracker, "support")).toEqual({ positionSec: 12 });
	});

	it("writes nothing once paused (the pause already wrote) or for music", () => {
		const paused = run([
			{ currentTime: 7 },
			{ currentTime: 7, playing: false },
		]);
		expect(flushProgress(paused.tracker, "support")).toBeNull();
		const music = run([{ currentTime: 9, family: "music" }]);
		expect(flushProgress(music.tracker, "music")).toBeNull();
	});
});
