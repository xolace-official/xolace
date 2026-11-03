import { describe, expect, it } from "vitest";
import { startListen, tickListen } from "./listen-tracker";

const TICK_SEC = 0.5;
const TICK_MS = TICK_SEC * 1000;

/** A player reporting status the way expo-audio does: a tick every half second while playing,
 * plus one on every play/pause/finish/lap change. Counts the listens it would log. */
function player(durationSec: number) {
	let tracker = startListen();
	let now = 0;
	let currentTime = 0;
	let playing = false;
	let didJustFinish = false;
	let laps = 0;
	let listens = 0;
	const tick = () => {
		const next = tickListen(tracker, {
			currentTime,
			didJustFinish,
			durationSec,
			laps,
			now,
			playing,
		});
		tracker = next.tracker;
		listens += next.logNow ? 1 : 0;
	};
	return {
		/** The natural end, reported on its own tick with playing off. */
		finish() {
			now += TICK_MS;
			currentTime = durationSec;
			playing = false;
			didJustFinish = true;
			tick();
		},
		/** A loop wrap: time jumps back to the start, then the lap count follows. */
		lap() {
			now += TICK_MS;
			currentTime = TICK_SEC;
			tick();
			laps += 1;
			tick();
		},
		/** One late tick covering `sec` of playback, as a locked screen can deliver. */
		lateTick(sec: number) {
			now += sec * 1000;
			currentTime += sec;
			tick();
		},
		get listens() {
			return listens;
		},
		pause() {
			playing = false;
			tick();
		},
		/** Play on from here to `toSec`. */
		play(toSec: number) {
			playing = true;
			didJustFinish = false;
			tick();
			while (currentTime + TICK_SEC <= toSec) {
				now += TICK_MS;
				currentTime += TICK_SEC;
				tick();
			}
		},
		/** Back to the start for another play, as the play button does after a finish. */
		replay() {
			currentTime = 0;
			this.play(0);
		},
		seek(toSec: number) {
			currentTime = toSec;
			tick();
		},
		wait(ms: number) {
			now += ms;
		},
	};
}

describe("listen tracker", () => {
	it("logs a listen once a play crosses 60 s, and only once", () => {
		const p = player(300);
		p.play(59.5);
		expect(p.listens).toBe(0);

		p.play(120);
		expect(p.listens).toBe(1);
	});

	it("pausing and resuming the same play doesn't log twice, or count the pause", () => {
		const p = player(300);
		p.play(30);
		p.pause();
		p.wait(10 * 60 * 1000);
		p.play(59);
		expect(p.listens).toBe(0);

		p.play(61);
		p.pause();
		p.play(200);
		expect(p.listens).toBe(1);
	});

	it("a 40 s track counts at its end, even when the last tick lands short of it", () => {
		const p = player(40);
		p.play(39.5);
		expect(p.listens).toBe(0);

		p.finish();
		expect(p.listens).toBe(1);
	});

	it("a track just over a minute counts at its end when the ticks fall short of 60 s", () => {
		const p = player(60.3);
		p.play(59);
		p.finish();
		expect(p.listens).toBe(1);
	});

	it("seeking to the end of a short track isn't listening to it", () => {
		const p = player(40);
		p.play(1);
		p.seek(38);
		p.play(39.5);
		p.finish();
		expect(p.listens).toBe(0);
	});

	it("seeking ahead isn't listening", () => {
		const p = player(300);
		p.play(10);
		p.seek(200);
		p.play(249);
		expect(p.listens).toBe(0);

		p.play(251);
		expect(p.listens).toBe(1);
	});

	it("a late tick from a locked screen still counts the time it covers", () => {
		const p = player(300);
		p.play(5);
		p.lateTick(90);
		expect(p.listens).toBe(1);
	});

	it("replaying after a finish is a new play", () => {
		const p = player(40);
		p.play(40);
		p.finish();
		p.replay();
		p.play(40);
		p.finish();
		expect(p.listens).toBe(2);
	});

	it("looping a track is one play, however many laps", () => {
		const p = player(40);
		for (let lap = 0; lap < 3; lap++) {
			p.play(39.5);
			p.lap();
		}
		expect(p.listens).toBe(1);
	});
});
