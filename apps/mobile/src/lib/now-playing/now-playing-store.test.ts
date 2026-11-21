import type { PostHog } from "posthog-react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type BoundTrack,
	clearNowPlaying,
	consumePlayOnLoad,
	endPreview,
	nowPlaying,
	publishPlayback,
	retryNowPlaying,
	setNowPlaying,
	startPreview,
	togglePlayback,
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

	it("carries where to start (Continue), once", () => {
		setNowPlaying(
			{ from: "explore-continue", slug: AWAKE },
			{ at: 312, play: true }
		);
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

function minted(currentTime: number, isPlaying: boolean) {
	const p = {
		currentTime,
		didJustFinish: false,
		duration: 600,
		error: null,
		isLoaded: true,
		isPlaying,
		laps: 0,
		loop: false,
		seekTo: async () => undefined,
		setLoop: () => undefined,
		setVolume: () => undefined,
		toggle: vi.fn(),
		track: { family: "support" } as unknown as BoundTrack,
		volume: 1,
	};
	publishPlayback(p);
	return p;
}

const HELD = "low-tide";
const PLACE = 95;

describe("Hold to hear, through the now-playing track", () => {
	beforeEach(() => {
		clearNowPlaying();
	});

	it("pauses what plays, plays the held track from the top, then puts it back playing", () => {
		setNowPlaying({ from: FROM, slug: AWAKE });
		consumePlayOnLoad(AWAKE);
		const was = minted(PLACE, true);
		expect(startPreview(HELD)).toBe(true);
		expect(was.toggle).toHaveBeenCalledOnce();
		expect(nowPlaying()).toEqual({ preview: true, slug: HELD });
		expect(consumePlayOnLoad(HELD)).toEqual({ asked: true, at: 0 });
		endPreview();
		expect(nowPlaying()).toEqual({ from: FROM, slug: AWAKE });
		expect(consumePlayOnLoad(AWAKE)).toEqual({ asked: true, at: PLACE });
	});

	it("puts a paused track back where it was, still paused", () => {
		setNowPlaying({ from: FROM, slug: AWAKE });
		const was = minted(PLACE, false);
		startPreview(HELD);
		expect(was.toggle).not.toHaveBeenCalled();
		endPreview();
		expect(consumePlayOnLoad(AWAKE)).toEqual({ asked: false, at: PLACE });
	});

	it("over nothing, leaves nothing loaded", () => {
		startPreview(HELD);
		endPreview();
		expect(nowPlaying()).toBeNull();
	});

	it("does nothing on the track already loaded", () => {
		setNowPlaying({ from: FROM, slug: AWAKE });
		expect(startPreview(AWAKE)).toBe(false);
		endPreview();
		expect(nowPlaying()).toEqual({ from: FROM, slug: AWAKE });
	});

	it("returns to the first track after a second hold, not to the first preview", () => {
		setNowPlaying({ from: FROM, slug: AWAKE });
		minted(PLACE, true);
		startPreview(HELD);
		minted(3, true);
		startPreview(RAIN);
		endPreview();
		expect(nowPlaying()).toEqual({ from: FROM, slug: AWAKE });
		expect(consumePlayOnLoad(AWAKE)).toEqual({ asked: true, at: PLACE });
	});

	it("leaves a track chosen since alone", () => {
		startPreview(HELD);
		setNowPlaying({ from: "topic", slug: RAIN }, { play: true });
		endPreview();
		expect(nowPlaying()).toEqual({ from: "topic", slug: RAIN });
	});

	it("sends no first-play event: not for the preview, not again for the track put back", () => {
		const capture = vi.fn();
		const posthog = { capture } as unknown as PostHog;
		setNowPlaying({ from: FROM, slug: AWAKE });
		togglePlayback(minted(0, false), posthog);
		expect(capture).toHaveBeenCalledOnce();
		startPreview(HELD);
		togglePlayback(minted(0, false), posthog);
		endPreview();
		togglePlayback(minted(PLACE, false), posthog);
		expect(capture).toHaveBeenCalledOnce();
	});
});
