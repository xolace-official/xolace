import { describe, expect, it } from "vitest";
import { assertPeaks, normalisePeaks, PEAK_BARS, PeakMeter } from "./peaks";

const RATE = 8000;

/** A mono signal, `seconds` long, with `level(t)` as its amplitude at time t. */
function tone(seconds: number, level: (t: number) => number, hz = 440) {
	const frames = Math.round(seconds * RATE);
	return Float32Array.from({ length: frames }, (_, i) => {
		const t = i / RATE;
		return level(t) * Math.sin(2 * Math.PI * hz * t);
	});
}

/** Feed channels to a meter in chunks of `chunk` frames. */
function measure(channels: Float32Array[], chunk = 1000) {
	const meter = new PeakMeter();
	const frames = channels[0]?.length ?? 0;
	for (let at = 0; at < frames; at += chunk) {
		const end = Math.min(frames, at + chunk);
		meter.push({
			channelData: channels.map((c) => c.subarray(at, end)),
			samplesDecoded: end - at,
		});
	}
	return meter.finish();
}

describe("PeakMeter", () => {
	it("gives silence 60 zeros, not noise blown up to full height", () => {
		expect(measure([new Float32Array(RATE * 5)])).toEqual(
			Array(PEAK_BARS).fill(0)
		);
		// Dither at −90 dBFS is still silence.
		const hiss = Float32Array.from({ length: RATE * 5 }, (_, i) =>
			i % 2 ? 3e-5 : -3e-5
		);
		expect(measure([hiss])).toEqual(Array(PEAK_BARS).fill(0));
	});

	it("gives a constant tone 60 full bars", () => {
		expect(measure([tone(30, () => 0.5)])).toEqual(Array(PEAK_BARS).fill(1));
	});

	it("reads a quiet track and a loud one the same", () => {
		const shape = (t: number) => (t < 10 ? 1 : 0.5);
		const quiet = measure([tone(20, (t) => 0.01 * shape(t))]);
		const loud = measure([tone(20, (t) => shape(t))]);
		// Mastered far too hot: eight times over full scale, clipped flat.
		const clipped = measure([
			tone(20, (t) => 8 * shape(t)).map((x) => Math.max(-1, Math.min(1, x))),
		]);
		expect(quiet).toEqual(loud);
		expect(loud?.slice(0, 30)).toEqual(Array(30).fill(1));
		expect(loud?.slice(30)).toEqual(Array(30).fill(0.5));
		expect(clipped?.slice(0, 30)).toEqual(Array(30).fill(1));
		for (const p of clipped?.slice(30) ?? []) {
			expect(p).toBeGreaterThan(0.8);
			expect(p).toBeLessThan(1);
		}
	});

	it("draws pauses as dips", () => {
		// 4 s phrases, 2 s breaths, 1 s slices: two bars in every six fall quiet.
		const peaks = measure([tone(60, (t) => (t % 6 < 4 ? 0.3 : 0.01))]);
		expect(peaks?.filter((p) => p === 1)).toHaveLength(40);
		expect(peaks?.filter((p) => p < 0.05)).toHaveLength(20);
	});

	it("measures against the third-loudest slice, so one loud moment doesn't shrink the rest", () => {
		const peaks = measure([tone(60, (t) => (t >= 30 && t < 31 ? 1 : 0.25))]);
		expect(peaks?.[30]).toBe(1);
		expect(peaks?.filter((p) => p === 1)).toHaveLength(PEAK_BARS);
	});

	it("splits a length that doesn't divide by 60 into equal slices of time", () => {
		// Each slice is 1009 7/60 frames wide, and the level halves inside
		// slice 29 or 30; the rest are whole.
		const frames = PEAK_BARS * 1009 + 7;
		const half = Math.floor(frames / 2);
		const signal = Float32Array.from({ length: frames }, (_, i) =>
			i < half ? 0.5 : 0.25
		);
		const peaks = measure([signal], 777);
		expect(peaks).toHaveLength(PEAK_BARS);
		expect(peaks?.slice(0, 29)).toEqual(Array(29).fill(1));
		expect(peaks?.slice(31)).toEqual(Array(29).fill(0.5));
	});

	it("measures a short track", () => {
		// Half a second, fading in: 67 frames a bar.
		const fade = measure([tone(0.5, (t) => t * 2)]);
		expect(fade).toHaveLength(PEAK_BARS);
		expect(fade?.slice(-3)).toEqual([1, 1, 1]);
		expect(fade?.[0]).toBeLessThan(0.05);
		expect(fade?.[29]).toBeCloseTo(0.5, 1);
		// Ten frames: fewer than the bars, each bar a sixth of a frame.
		const blip = measure([Float32Array.from({ length: 10 }, () => 0.4)]);
		expect(blip).toEqual(Array(PEAK_BARS).fill(1));
	});

	it("comes out the same however the audio is chunked", () => {
		const signal = tone(17.3, (t) => 0.2 + 0.7 * Math.abs(Math.sin(t)));
		const whole = measure([signal], signal.length);
		expect(measure([signal], 1)).toEqual(whole);
		expect(measure([signal], 255)).toEqual(whole);
		expect(measure([signal], 4097)).toEqual(whole);
	});

	it("counts every channel alike", () => {
		const left = tone(10, () => 0.5);
		const silent = new Float32Array(left.length);
		expect(measure([left, silent])).toEqual(measure([left]));
	});

	it("returns null when no audio came through", () => {
		const meter = new PeakMeter();
		meter.push({ channelData: [], samplesDecoded: 0 });
		expect(meter.finish()).toBeNull();
	});
});

describe("normalisePeaks", () => {
	it("rounds to two decimals and caps at 1", () => {
		const rms = [0.2, 0.2, 0.2, 0.1234, 0.4, ...Array(55).fill(0.01)];
		const peaks = normalisePeaks(rms);
		expect(peaks.slice(0, 5)).toEqual([1, 1, 1, 0.62, 1]);
		expect(peaks[5]).toBe(0.05);
	});
});

describe("assertPeaks", () => {
	it("takes exactly 60 numbers from 0 to 1", () => {
		expect(() => assertPeaks(Array(PEAK_BARS).fill(0.5))).not.toThrow();
		expect(() => assertPeaks(Array(59).fill(0.5))).toThrow();
		expect(() => assertPeaks([...Array(59).fill(0.5), 1.01])).toThrow();
		expect(() => assertPeaks([...Array(59).fill(0.5), -0.1])).toThrow();
		expect(() => assertPeaks([...Array(59).fill(0.5), Number.NaN])).toThrow();
	});
});
