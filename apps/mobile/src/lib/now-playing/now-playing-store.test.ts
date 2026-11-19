import { beforeEach, describe, expect, it } from "vitest";
import {
	clearNowPlaying,
	consumePlayOnLoad,
	retryNowPlaying,
	setNowPlaying,
} from "@/lib/now-playing/now-playing-store";
import {
	pickSleep,
	setSleepTimer,
	sleepTimer,
} from "@/lib/now-playing/sleep-timer";

const AWAKE = "not-the-only-one-awake";
const RAIN = "rain-on-a-tin-roof";
const FROM = "library-hub";

describe("play on load, in the now-playing store", () => {
	beforeEach(() => {
		clearNowPlaying();
	});

	it("arms the flag even when the track is already the current one (the early return)", () => {
		setNowPlaying({ from: FROM, slug: AWAKE });
		// Same slug, from and step: setNowPlaying returns early, after arming.
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		expect(consumePlayOnLoad(AWAKE).asked).toBe(true);
	});

	it("is consumed once by the host: a later remount doesn't play again", () => {
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		expect(consumePlayOnLoad(AWAKE).asked).toBe(true);
		expect(consumePlayOnLoad(AWAKE).asked).toBe(false);
	});

	it("is cleared with the track", () => {
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		clearNowPlaying();
		expect(consumePlayOnLoad(AWAKE).asked).toBe(false);
	});

	it("keeps today's behaviour for a caller without the flag", () => {
		setNowPlaying({ from: "topic", slug: RAIN });
		expect(consumePlayOnLoad(RAIN).asked).toBe(false);
	});

	it("survives the player opening the same slug, not another one", () => {
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		setNowPlaying({ from: "topic", slug: AWAKE });
		expect(consumePlayOnLoad(AWAKE).asked).toBe(true);
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		setNowPlaying({ from: "topic", slug: RAIN });
		expect(consumePlayOnLoad(AWAKE).asked).toBe(false);
	});

	it("carries where to start (Continue), once, and only with a play", () => {
		setNowPlaying(
			{ from: "explore-continue", slug: AWAKE },
			{ at: 312, play: true }
		);
		// The player opening over it keeps the place.
		setNowPlaying({ from: "explore-continue", slug: AWAKE });
		expect(consumePlayOnLoad(AWAKE)).toEqual({ asked: true, at: 312 });
		setNowPlaying({ from: FROM, slug: RAIN }, { play: true });
		expect(consumePlayOnLoad(RAIN)).toEqual({ asked: true, at: 0 });
	});
});

describe("the sleep timer, with the now-playing track", () => {
	beforeEach(() => {
		clearNowPlaying();
	});

	it("carries a running timer to a new track, but not Paused by", () => {
		setNowPlaying({ from: FROM, slug: AWAKE });
		setSleepTimer({ ...pickSleep(30), slept: true });
		setNowPlaying({ from: FROM, slug: RAIN });
		expect(sleepTimer()).toEqual(pickSleep(30));
	});

	it("keeps the timer through a Try again", () => {
		setNowPlaying({ from: FROM, slug: AWAKE });
		setSleepTimer(pickSleep(45));
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		retryNowPlaying();
		expect(sleepTimer()).toEqual(pickSleep(45));
		expect(consumePlayOnLoad(AWAKE).asked).toBe(true);
	});
});
