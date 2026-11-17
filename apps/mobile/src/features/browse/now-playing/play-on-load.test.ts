import { describe, expect, it } from "vitest";
import {
	armPlayOnLoad,
	mintOf,
	playStep,
	takePlayOnLoad,
} from "@/features/browse/now-playing/play-on-load";

const AWAKE = "not-the-only-one-awake";
const RAIN = "rain-on-a-tin-roof";
const IN = { locked: false, mint: "in", slug: AWAKE } as const;

describe("playStep", () => {
	it("shows a free listener the paywall before anything loads", () => {
		expect(
			playStep({ ...IN, loaded: null, locked: true, playing: false })
		).toBe("paywall");
		// Even over a track that's loaded: nothing is queued or switched.
		expect(playStep({ ...IN, loaded: RAIN, locked: true, playing: true })).toBe(
			"paywall"
		);
	});

	it("resumes the same track, loaded and paused, without a reload", () => {
		expect(playStep({ ...IN, loaded: AWAKE, playing: false })).toBe("resume");
	});

	it("does nothing when that track is already playing", () => {
		expect(playStep({ ...IN, loaded: AWAKE, playing: true })).toBe("nothing");
	});

	it("loads a track when another, or none, is loaded", () => {
		expect(playStep({ ...IN, loaded: RAIN, playing: true })).toBe("load");
		expect(playStep({ ...IN, loaded: null, playing: false })).toBe("load");
	});

	it("waits on a track still minting rather than toggling a player with nothing in it", () => {
		expect(
			playStep({ ...IN, loaded: AWAKE, mint: "pending", playing: false })
		).toBe("load");
	});

	it("loads a failed mint again instead of a silent resume", () => {
		expect(
			playStep({ ...IN, loaded: AWAKE, mint: "failed", playing: false })
		).toBe("reload");
	});
});

describe("mintOf", () => {
	it("reads a playback's mint", () => {
		expect(mintOf({ error: null, track: { url: "x" } })).toBe("in");
		expect(mintOf({ error: null, track: undefined })).toBe("pending");
		expect(mintOf({ error: null, track: null })).toBe("failed");
		expect(mintOf({ error: new Error("refused"), track: undefined })).toBe(
			"failed"
		);
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
