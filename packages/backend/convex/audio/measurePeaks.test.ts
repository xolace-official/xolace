import { describe, expect, it } from "vitest";
import { makeWav, TONE_MP3_BASE64 } from "./fixtures.helpers";
import { formatOf, measureStream } from "./measurePeaks";

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

describe("formatOf", () => {
	it("knows MP3 and WAV by the key's extension, and nothing else", () => {
		expect(formatOf("support/grounding/0b8f.mp3")).toBe("mp3");
		expect(formatOf("music/rain/0b8f.WAV")).toBe("wav");
		expect(formatOf("support/grounding/0b8f.m4a")).toBeNull();
		expect(formatOf("support/grounding")).toBeNull();
	});
});

describe("measureStream", () => {
	// The fixture: full-level tone for 1 s, silence for 1 s, a quarter-level
	// tone for 1 s. The encoder's priming delay shifts it a few ms, so the
	// bars at each change are left out.
	it("decodes an MP3 through the WebAssembly decoder, in any chunking", async () => {
		for (const size of [97, 4096, TONE_MP3.length]) {
			const peaks = await measureStream("mp3", streamOf(TONE_MP3, size));
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
		const peaks = await measureStream(
			"wav",
			streamOf(makeWav(frames, { bits: 16 }), 1000)
		);
		expect(peaks.slice(0, 29)).toEqual(Array(29).fill(1));
		expect(peaks.slice(31)).toEqual(Array(29).fill(0.5));
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
