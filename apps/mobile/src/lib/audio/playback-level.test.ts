import { describe, expect, it } from "vitest";
import { playbackLevels } from "./playback-level";

describe("playbackLevels", () => {
	it("plays at the listener's own level with no options", () => {
		expect(playbackLevels({ loop: true, volume: 0.78 })).toEqual({
			native: { loop: true, volume: 0.78 },
			shown: { loop: true, volume: 0.78 },
		});
	});

	it("fades the sound with the gain and never moves the slider", () => {
		for (const gain of [1, 0.5, 0.1, 0]) {
			const levels = playbackLevels({ loop: false, volume: 0.8 }, { gain });
			expect(levels.native.volume).toBeCloseTo(0.8 * gain);
			expect(levels.shown.volume).toBe(0.8);
		}
	});

	it("stops at the end of this play with End of track, even on Repeat", () => {
		const levels = playbackLevels(
			{ loop: true, volume: 1 },
			{ stopAtEnd: true }
		);
		expect(levels.native.loop).toBe(false);
		expect(levels.shown.loop).toBe(true);
	});

	it("keeps both levels inside 0–1", () => {
		const levels = playbackLevels({ loop: false, volume: 1.4 }, { gain: 2 });
		expect(levels.native.volume).toBe(1);
		expect(levels.shown.volume).toBe(1);
	});
});
