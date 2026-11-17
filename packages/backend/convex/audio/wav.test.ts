import { describe, expect, it } from "vitest";
import { makeWav } from "./fixtures.helpers";
import { WavDecoder } from "./wav";

/** Decode `bytes` fed in chunks of `size`, collecting every channel. */
function decodeAll(bytes: Uint8Array, size: number) {
	const wav = new WavDecoder();
	const channels: number[][] = [];
	for (let at = 0; at < bytes.length; at += size) {
		const out = wav.decode(bytes.subarray(at, at + size));
		out.channelData.forEach((c, i) => {
			channels[i] = [...(channels[i] ?? []), ...c];
		});
	}
	return channels;
}

/** RIFF header (12) plus the fmt chunk's id and size (8). */
const FORMAT_TAG_AT = 20;

const FRAMES = [
	[0, 0.5],
	[0.25, -0.25],
	[-1, 0.75],
	[0.5, 0],
];

describe("WavDecoder", () => {
	it.each([
		{ bits: 8 },
		{ bits: 16 },
		{ bits: 24 },
		{ bits: 32 },
		{ bits: 32, float: true },
		{ bits: 16, extensible: true },
		{ bits: 32, extensible: true, float: true },
	])("reads %o, split anywhere", (encoding) => {
		const bytes = makeWav(FRAMES, encoding);
		const tolerance = encoding.bits === 8 ? 0.01 : 1e-4;
		for (const size of [1, 3, 7, bytes.length]) {
			const [left, right] = decodeAll(bytes, size);
			expect(left).toHaveLength(FRAMES.length);
			left?.forEach((x, i) => {
				expect(Math.abs(x - (FRAMES[i]?.[0] ?? 0))).toBeLessThan(tolerance);
				expect(
					Math.abs((right?.[i] ?? 0) - (FRAMES[i]?.[1] ?? 0))
				).toBeLessThan(tolerance);
			});
		}
	});

	it("skips chunks before the data, and stops at the data's end", () => {
		const list = new Uint8Array([
			..."LIST".split("").map((c) => c.charCodeAt(0)),
			3,
			0,
			0,
			0,
			1,
			2,
			3,
			0,
		]);
		const bytes = makeWav(FRAMES, { bits: 16 }, { before: [list] });
		const trailing = new Uint8Array([...bytes, 9, 9, 9, 9, 9, 9, 9, 9]);
		expect(decodeAll(trailing, 5)[0]).toHaveLength(FRAMES.length);
	});

	it("reads to the end when the data size was never filled in", () => {
		const bytes = makeWav(FRAMES, { bits: 16 }, { dataSize: 0 });
		expect(decodeAll(bytes, 2)[0]).toHaveLength(FRAMES.length);
	});

	it("refuses what it can't read", () => {
		expect(() =>
			new WavDecoder().decode(new TextEncoder().encode("ID3 not a wav"))
		).toThrow("not a RIFF/WAVE file");
		// 16-bit samples marked float: it reads float at 32 bits only.
		const halfFloat = makeWav(FRAMES, { bits: 16 });
		new DataView(halfFloat.buffer).setUint16(FORMAT_TAG_AT, 3, true);
		expect(() => new WavDecoder().decode(halfFloat)).toThrow(
			"unsupported WAV encoding"
		);
	});
});
