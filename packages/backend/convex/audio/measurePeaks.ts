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
 * Best effort, never thrown: a file that won't decode, or decodes to the
 * wrong length, is logged and skipped. R2 being unreachable or answering
 * 5xx/429 gets one retry ten minutes later. Measuring again is always safe
 * (`trackPeaks.toMeasure` skips a track that has its peaks; `trackPeaks.save`
 * skips one whose audio changed): re-uploading the same file, the admin's
 * Measure again and re-running the backfill all do it.
 */

/** Long enough to stream the largest file; signed per run, never cached. */
const URL_TTL_SEC = 10 * 60;

/** One retry after R2 is unreachable or answers 5xx/429, this much later. */
const RETRY_DELAY_MS = 10 * 60 * 1000;

/** How far the decoded length may stray from `durationSec`: the larger of these. */
const LENGTH_SLACK = 0.02;
const LENGTH_SLACK_SEC = 1.5;

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

/** A measure of one stream: its 60 peaks, and how long the audio that decoded lasts. */
type Measured = { peaks: number[]; seconds: number | null };

/**
 * The 60 peaks of an audio stream. Throws when it holds no audio it can
 * decode. The stream is cancelled if decoding fails partway.
 */
export async function measureStream(
	format: AudioFormat,
	stream: ReadableStream<Uint8Array>
): Promise<Measured> {
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
	} catch (error) {
		await reader.cancel().catch(() => undefined);
		throw error;
	} finally {
		decoder.free();
		reader.releaseLock();
	}
	const peaks = meter.finish();
	if (!peaks) {
		throw new Error("no audio decoded");
	}
	return { peaks, seconds: meter.seconds };
}

/**
 * Whether the audio that decoded is as long as the track says. mpg123 skips
 * damaged frames without an error, and a truncated object just ends early,
 * so either would otherwise spread 60 bars over the wrong stretch of audio.
 * `durationSec` is whole seconds from the browser or the ingest script.
 */
export function lengthMismatch(seconds: number | null, durationSec: number) {
	if (seconds === null) {
		return "the decoder never gave a sample rate";
	}
	const slack = Math.max(LENGTH_SLACK_SEC, durationSec * LENGTH_SLACK);
	if (Math.abs(seconds - durationSec) <= slack) {
		return null;
	}
	return `decoded ${seconds.toFixed(1)} s of a ${durationSec} s track (damaged or cut short)`;
}

/** R2 being briefly unavailable, as opposed to a file that isn't there or won't decode. */
const transient = (status: number) => status === 429 || status >= 500;

export const measure = internalAction({
	args: {
		/** Set on the one delayed retry after a transient fetch failure. */
		retry: v.optional(v.boolean()),
		trackId: v.id("audio_tracks"),
	},
	handler: async (ctx, { retry = false, trackId }) => {
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
		const retryLater = async (why: string) => {
			if (retry) {
				skip(`${why}, again on retry`);
				return;
			}
			console.warn(
				`measurePeaks: ${track.slug} (${track.key}): ${why}; trying once more in ${RETRY_DELAY_MS / 60_000} minutes`
			);
			await ctx.scheduler.runAfter(
				RETRY_DELAY_MS,
				internal.audio.measurePeaks.measure,
				{ retry: true, trackId }
			);
		};
		const format = formatOf(track.key);
		if (!format) {
			skip("no decoder for its format; the player draws its line");
			return null;
		}
		let response: Response;
		try {
			response = await fetch(
				await r2.getUrl(track.key, { expiresIn: URL_TTL_SEC })
			);
		} catch (error) {
			await retryLater(
				`couldn't reach R2 (${error instanceof Error ? error.message : String(error)})`
			);
			return null;
		}
		if (!(response.ok && response.body)) {
			await response.body?.cancel();
			if (transient(response.status)) {
				await retryLater(`R2 answered ${response.status}`);
			} else {
				skip(`R2 answered ${response.status}`);
			}
			return null;
		}
		try {
			const { peaks, seconds } = await measureStream(format, response.body);
			const mismatch = lengthMismatch(seconds, track.durationSec);
			if (mismatch) {
				skip(mismatch);
				return null;
			}
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
