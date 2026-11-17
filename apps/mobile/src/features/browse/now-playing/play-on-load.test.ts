import { describe, expect, it } from "vitest";
import {
	armPlayOnLoad,
	playStep,
	takePlayOnLoad,
} from "@/features/browse/now-playing/play-on-load";

const AWAKE = "not-the-only-one-awake";
const RAIN = "rain-on-a-tin-roof";

describe("playStep", () => {
	it("shows a free listener the paywall before anything loads", () => {
		expect(
			playStep({ loaded: null, locked: true, playing: false, slug: AWAKE })
		).toBe("paywall");
		// Even over a track that's loaded: nothing is queued or switched.
		expect(
			playStep({ loaded: RAIN, locked: true, playing: true, slug: AWAKE })
		).toBe("paywall");
	});

	it("resumes the same track, loaded and paused, without a reload", () => {
		expect(
			playStep({ loaded: AWAKE, locked: false, playing: false, slug: AWAKE })
		).toBe("resume");
	});

	it("does nothing when that track is already playing", () => {
		expect(
			playStep({ loaded: AWAKE, locked: false, playing: true, slug: AWAKE })
		).toBe("nothing");
	});

	it("loads a track when another, or none, is loaded", () => {
		expect(
			playStep({ loaded: RAIN, locked: false, playing: true, slug: AWAKE })
		).toBe("load");
		expect(
			playStep({ loaded: null, locked: false, playing: false, slug: AWAKE })
		).toBe("load");
	});
});

describe("the play-on-load flag", () => {
	it("arms for the slug asked to play", () => {
		expect(armPlayOnLoad(null, AWAKE, true)).toBe(AWAKE);
		// Switching tracks: the new one waits, the old one's wait is gone.
		expect(armPlayOnLoad(RAIN, AWAKE, true)).toBe(AWAKE);
	});

	it("leaves old callers as they were: no flag, nothing armed", () => {
		expect(armPlayOnLoad(null, AWAKE, false)).toBeNull();
	});

	it("keeps a wait when the player opens the same slug, drops it for another", () => {
		expect(armPlayOnLoad(AWAKE, AWAKE, false)).toBe(AWAKE);
		expect(armPlayOnLoad(AWAKE, RAIN, false)).toBeNull();
	});

	it("is taken once: a later remount of the host doesn't play again", () => {
		const first = takePlayOnLoad(AWAKE, AWAKE);
		expect(first).toEqual({ asked: true, pending: null });
		expect(takePlayOnLoad(first.pending, AWAKE)).toEqual({
			asked: false,
			pending: null,
		});
	});

	it("isn't taken by another slug's load", () => {
		expect(takePlayOnLoad(AWAKE, RAIN)).toEqual({
			asked: false,
			pending: AWAKE,
		});
	});
});
