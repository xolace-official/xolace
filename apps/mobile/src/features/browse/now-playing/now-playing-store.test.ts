import { beforeEach, describe, expect, it } from "vitest";
import {
	clearNowPlaying,
	consumePlayOnLoad,
	setNowPlaying,
} from "@/features/browse/now-playing/now-playing-store";

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
		expect(consumePlayOnLoad(AWAKE)).toBe(true);
	});

	it("is consumed once by the host: a later remount doesn't play again", () => {
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		expect(consumePlayOnLoad(AWAKE)).toBe(true);
		expect(consumePlayOnLoad(AWAKE)).toBe(false);
	});

	it("is cleared with the track", () => {
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		clearNowPlaying();
		expect(consumePlayOnLoad(AWAKE)).toBe(false);
	});

	it("keeps today's behaviour for a caller without the flag", () => {
		setNowPlaying({ from: "topic", slug: RAIN });
		expect(consumePlayOnLoad(RAIN)).toBe(false);
	});

	it("survives the player opening the same slug, not another one", () => {
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		setNowPlaying({ from: "topic", slug: AWAKE });
		expect(consumePlayOnLoad(AWAKE)).toBe(true);
		setNowPlaying({ from: FROM, slug: AWAKE }, { play: true });
		setNowPlaying({ from: "topic", slug: RAIN });
		expect(consumePlayOnLoad(AWAKE)).toBe(false);
	});
});
