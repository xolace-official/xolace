"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { r2 } from "../ai/paths/audioTracks";
import { type AudioFormat, formatOf } from "./formats";
import { type DecodedChunk, PeakMeter } from "./peaks";
import { WavDecoder } from "./wav";

/**
 * Measure a track's waveform (`audio_tracks.peaks`, maths in `peaks.ts`) from
 * its audio in R2. Node, for the MP3 decoder: `mpg123-decoder` is mpg123
 * compiled to WebAssembly, with no native binary to install. The file is
 * streamed through it, so memory stays flat even for the longest track
 * (40 MB, 21 minutes).
 *
 * Every track in the catalogue is an MP3. WAV is read directly (`wav.ts`).
 * Uploads take only these two (`formats.ts`); a key in any other format, from
 * before that, logs and keeps no peaks, and the player draws its plain line,
 * as it does for any track without them.
 *
 * Best effort, never thrown: a file that won't fetch or decode is logged and
 * skipped. Re-running is the fix, and safe (`trackPeaks.toMeasure` skips a
 * track that has its peaks; `trackPeaks.save` skips one whose audio changed).
 */

/** Long enough to stream the largest file; signed per run, never cached. */
const URL_TTL_SEC = 10 * 60;

type Decoder = {
	decode: (bytes: Uint8Array) => DecodedChunk;
	free: () => void;
};

async function openDecoder(format: AudioFormat): Promise<Decoder> {
	if (format === "wav") {
		const wav = new WavDecoder();
		return { decode: (bytes) => wav.decode(bytes), free: () => undefined };
	}
	// Loaded only for an MP3, so nothing else pays for the WebAssembly.
	const { MPEGDecoder } = await import("mpg123-decoder");
	const mp3 = new MPEGDecoder();
	await mp3.ready;
	return mp3;
}

/** The 60 peaks of an audio stream. Throws when it holds no audio it can decode. */
export async function measureStream(
	format: AudioFormat,
	stream: ReadableStream<Uint8Array>
): Promise<number[]> {
	const decoder = await openDecoder(format);
	const meter = new PeakMeter();
	const reader = stream.getReader();
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			meter.push(decoder.decode(value));
		}
	} finally {
		decoder.free();
		reader.releaseLock();
	}
	const peaks = meter.finish();
	if (!peaks) {
		throw new Error("no audio decoded");
	}
	return peaks;
}

export const measure = internalAction({
	args: { trackId: v.id("audio_tracks") },
	handler: async (ctx, { trackId }) => {
		const track = await ctx.runQuery(internal.audio.trackPeaks.toMeasure, {
			trackId,
		});
		if (!track) {
			return null;
		}
		const skip = (why: string) =>
			console.warn(
				`measurePeaks: ${track.slug} (${track.key}) has no peaks: ${why}`
			);
		const format = formatOf(track.key);
		if (!format) {
			skip("no decoder for its format; the player draws its line");
			return null;
		}
		try {
			const response = await fetch(
				await r2.getUrl(track.key, { expiresIn: URL_TTL_SEC })
			);
			if (!(response.ok && response.body)) {
				skip(`R2 answered ${response.status}`);
				return null;
			}
			const peaks = await measureStream(format, response.body);
			await ctx.runMutation(internal.audio.trackPeaks.save, {
				peaks,
				sha256: track.sha256,
				trackId,
			});
		} catch (error) {
			skip(error instanceof Error ? error.message : String(error));
		}
		return null;
	},
	returns: v.null(),
});
