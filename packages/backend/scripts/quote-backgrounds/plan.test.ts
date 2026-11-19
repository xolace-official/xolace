/**
 * B18: the numbers behind the art processing. What can go wrong: a loop's
 * seam shows (the crossfade doesn't end where the clip starts), a loop lands
 * far from 1–1.5 MB, the ambient track repeats with the video or falls short
 * of ~30 s, or a click sits at its wrap (AAC end padding, a limiter's gain).
 */
import { describe, expect, it } from "vitest";
import {
	AAC_FRAME,
	AUDIO,
	artFileName,
	audioPlan,
	chainFilter,
	gainDb,
	nextStillQuality,
	rotateFilter,
	SAMPLE_RATE,
	STILL,
	seamAudioFilter,
	seamSeconds,
	VIDEO_TARGET_BYTES,
	videoArgs,
	videoFilter,
	videoKbps,
} from "./plan";

describe("the video seam", () => {
	it("crossfades the last second into the first, a sixth of a short clip", () => {
		expect(seamSeconds(8)).toBe(1);
		expect(seamSeconds(4.2)).toBe(0.7);
	});

	it("runs the clip from F, fading its end into its first F seconds", () => {
		const filter = videoFilter(8);
		expect(filter).toContain("[a]trim=start=1:end=8");
		expect(filter).toContain("[b]trim=start=0:end=1");
		// The fade starts F before the trimmed clip's end (8 - 1 - 1).
		expect(filter).toContain("xfade=transition=fade:duration=1:offset=6");
		expect(filter).toContain("crop=720:1280");
	});

	it("aims each loop at the target size, within sane bitrates", () => {
		const seconds = 7;
		const bytes = (videoKbps(seconds) * 1000 * seconds) / 8;
		expect(bytes).toBeGreaterThan(VIDEO_TARGET_BYTES * 0.95);
		expect(bytes).toBeLessThan(VIDEO_TARGET_BYTES * 1.05);
		expect(videoKbps(1)).toBe(2500);
		expect(videoKbps(60)).toBe(900);
	});

	it("encodes silent H.264 in two passes, the first thrown away", () => {
		const opts = {
			duration: 8,
			input: "in.mp4",
			output: "out.mp4",
			passlog: "log",
		};
		const first = videoArgs({ ...opts, pass: 1 });
		const second = videoArgs({ ...opts, pass: 2 });
		expect(first.slice(-3)).toEqual(["-f", "mp4", "/dev/null"]);
		expect(second.at(-1)).toBe("out.mp4");
		for (const argv of [first, second]) {
			expect(argv).toContain("-an");
			expect(argv).toContain("libx264");
			expect(argv).toContain("+faststart");
		}
	});
});

describe("the ambient track", () => {
	it("is about 30 s, from copies started at different points", () => {
		for (const clip of [6, 8, 11.6]) {
			const plan = audioPlan(clip);
			expect(plan.length).toBeGreaterThanOrEqual(AUDIO.targetSeconds);
			expect(plan.length).toBeLessThan(AUDIO.targetSeconds + clip);
			expect(new Set(plan.rotations).size).toBe(plan.rotations.length);
			const base = clip - plan.seam;
			for (const at of plan.rotations) {
				expect(at).toBeGreaterThanOrEqual(0);
				expect(at).toBeLessThan(base);
			}
		}
	});

	it("never runs the track as long as the video, so the sound doesn't restart with it", () => {
		expect(audioPlan(6).length).toBeGreaterThan(4 * 6);
	});

	it("seams sample-exactly and, at the end, to a whole number of AAC frames", () => {
		const samples = 30 * SAMPLE_RATE + 777;
		const seam = 2 * SAMPLE_RATE;
		expect(seamAudioFilter(samples, 2)).toContain(`end_sample=${samples}`);
		const whole = seamAudioFilter(samples, 2, true);
		const end = Number(whole.match(/start_sample=\d+:end_sample=(\d+)/)?.[1]);
		expect((end - seam) % AAC_FRAME).toBe(0);
		expect(whole).toContain(`acrossfade=ns=${seam}`);
	});

	it("rotates a loop by splitting it at the start point", () => {
		expect(rotateFilter(10, 0)).toBe("[0:a]anull");
		expect(rotateFilter(10, 3.5)).toContain("atrim=start=3.5:end=10");
		expect(rotateFilter(10, 3.5)).toContain("concat=n=2:v=0:a=1");
	});

	it("chains every copy into the next", () => {
		const chain = chainFilter(3, 2);
		expect(chain).toBe(
			"[0:a][1:a]acrossfade=d=2:c1=qsin:c2=qsin[x1];[x1][2:a]acrossfade=d=2:c1=qsin:c2=qsin"
		);
	});

	it("takes one gain toward the target, never past the peak ceiling", () => {
		expect(gainDb({ loudness: -30, truePeak: -12 })).toBe(6);
		expect(gainDb({ loudness: -30, truePeak: -3 })).toBe(1);
		expect(gainDb({ loudness: -16.7, truePeak: -4 })).toBe(-7.3);
	});
});

describe("still quality", () => {
	it("starts high and steps down in small steps, never below the floor", () => {
		const tried: number[] = [STILL.quality];
		while (tried.at(-1)! > STILL.minQuality) {
			tried.push(nextStillQuality(tried.at(-1)!));
		}
		expect(tried[0]).toBeGreaterThanOrEqual(90);
		expect(Math.min(...tried)).toBe(STILL.minQuality);
		expect(STILL.minQuality).toBeGreaterThanOrEqual(75);
		for (let i = 1; i < tried.length; i++) {
			expect(tried[i - 1] - tried[i]).toBeLessThanOrEqual(3);
		}
	});
});

describe("finding the art", () => {
	const files = ["forest-rain.MP4", "hearth.mp4", "silk.JPEG", "notes.txt"];

	it("matches the extension in any case and keeps the name as it is on disk", () => {
		expect(artFileName(files, "forest-rain", ["mp4", "mov"])).toBe(
			"forest-rain.MP4"
		);
		expect(artFileName(files, "silk", ["png", "jpg", "jpeg"])).toBe(
			"silk.JPEG"
		);
	});

	it("tries the extensions in order and finds nothing for a key with no file", () => {
		expect(artFileName(["a.mov", "a.mp4"], "a", ["mp4", "mov"])).toBe("a.mp4");
		expect(artFileName(files, "shoreline", ["mp4", "mov"])).toBeUndefined();
	});
});
