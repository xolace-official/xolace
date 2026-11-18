import { describe, expect, it } from "vitest";
import { makeWav, TONE_MP3_BASE64 } from "./fixtures.helpers";
import { lengthMismatch, measureStream } from "./measurePeaks";

/** `bytes` as a stream of `size`-byte chunks, as a fetch body arrives. */
function streamOf(bytes: Uint8Array, size: number) {
	let at = 0;
	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (at >= bytes.length) {
				controller.close();
				return;
			}
			controller.enqueue(bytes.slice(at, at + size));
			at += size;
		},
	});
}

const TONE_MP3 = Uint8Array.from(atob(TONE_MP3_BASE64), (c) => c.charCodeAt(0));
const TONE_SEC = 3;

/** A copy of `bytes` with `[from, to)` overwritten by noise, as a bad disk or transfer leaves it. */
function damaged(bytes: Uint8Array, from: number, to: number) {
	const out = bytes.slice();
	let x = 7;
	for (let i = from; i < to; i++) {
		x = (x * 16_807) % 2_147_483_647;
		out[i] = x % 256;
	}
	return out;
}

describe("measureStream", () => {
	// The fixture: full-level tone for 1 s, silence for 1 s, a quarter-level
	// tone for 1 s. The encoder's priming delay shifts it a few ms, so the
	// bars at each change are left out.
	it("decodes an MP3 through the WebAssembly decoder, in any chunking", async () => {
		for (const size of [97, 4096, TONE_MP3.length]) {
			const { peaks, seconds } = await measureStream(
				"mp3",
				streamOf(TONE_MP3, size)
			);
			expect(seconds).toBeCloseTo(TONE_SEC, 2);
			expect(lengthMismatch(seconds, TONE_SEC)).toBeNull();
			expect(peaks).toHaveLength(60);
			expect(peaks.slice(1, 19)).toEqual(Array(18).fill(1));
			for (const p of peaks.slice(22, 39)) {
				expect(p).toBeLessThan(0.02);
			}
			for (const p of peaks.slice(42, 59)) {
				expect(p).toBeCloseTo(0.25, 1);
			}
		}
	});

	it("decodes a WAV", async () => {
		// A square wave, so every slice's RMS is exactly its level.
		const frames = Array.from({ length: 6000 }, (_, i) => [
			(i < 3000 ? 0.8 : 0.4) * (i % 2 ? 1 : -1),
		]);
		const { peaks, seconds } = await measureStream(
			"wav",
			streamOf(makeWav(frames, { bits: 16 }), 1000)
		);
		// 6,000 frames at the fixture's 8 kHz.
		expect(seconds).toBe(0.75);
		expect(peaks.slice(0, 29)).toEqual(Array(29).fill(1));
		expect(peaks.slice(31)).toEqual(Array(29).fill(0.5));
	});

	// mpg123 skips frames it can't decode and reports no error, so a damaged
	// or cut-short file still yields 60 bars, spread over the wrong audio.
	// Only its length gives it away.
	it("decodes a damaged MP3 short, without an error, and the length check catches it", async () => {
		const slightly = await measureStream(
			"mp3",
			streamOf(damaged(TONE_MP3, 3000, 3400), 4096)
		);
		expect(slightly.seconds).toBeLessThan(TONE_SEC - 0.05);
		const badly = await measureStream(
			"mp3",
			streamOf(damaged(TONE_MP3, 1500, 7500), 4096)
		);
		expect(badly.peaks).toHaveLength(60);
		expect(lengthMismatch(badly.seconds, TONE_SEC)).toMatch(
			/^decoded 1\.0 s of a 3 s track \(damaged or cut short\)$/
		);
	});

	it("decodes a cut-short MP3 short, and the length check catches it", async () => {
		const cut = TONE_MP3.slice(0, Math.floor(TONE_MP3.length * 0.4));
		const { seconds } = await measureStream("mp3", streamOf(cut, 4096));
		expect(lengthMismatch(seconds, TONE_SEC)).toMatch(/cut short/);
	});

	it("throws on a file that holds no audio", async () => {
		const junk = new TextEncoder().encode("<Error>NoSuchKey</Error>");
		await expect(measureStream("mp3", streamOf(junk, 8))).rejects.toThrow(
			"no audio decoded"
		);
		await expect(measureStream("wav", streamOf(junk, 8))).rejects.toThrow(
			"not a RIFF/WAVE file"
		);
	});
});

describe("lengthMismatch", () => {
	it("allows the larger of 1.5 s and 2% either way, for whole-second lengths", () => {
		// Across the 442 prod tracks, stored lengths sit within 0.98 s (1.3%) of the decode.
		expect(lengthMismatch(60.98, 60)).toBeNull();
		expect(lengthMismatch(38.6, 40)).toBeNull();
		expect(lengthMismatch(1245.9, 1245)).toBeNull();
		expect(lengthMismatch(1269, 1245)).toBeNull();
		expect(lengthMismatch(57.9, 60)).toMatch(
			/^decoded 57\.9 s of a 60 s track/
		);
		expect(lengthMismatch(1280, 1245)).toMatch(/1280\.0 s of a 1245 s/);
		expect(lengthMismatch(null, 60)).toBe(
			"the decoder never gave a sample rate"
		);
	});
});
