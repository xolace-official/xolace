import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../_generated/server";
import { trackPeaksValidator } from "../lib/validators";
import { assertPeaks } from "./peaks";

/**
 * `audio_tracks.peaks`, around the measuring action (`measurePeaks.ts`, which
 * needs Node for its decoder). `measurePeaksLater` is called whenever a
 * support track gets new audio (the admin's New track and Replace audio in
 * `admin/audio.ts`; the shared upsert behind the Kindling script and admin
 * imports, `ai/paths/audioTracks.ts upsertTrackRecord`), and again when the
 * same audio comes back to a track still missing its peaks, by the admin's
 * Measure again, and by `migrations:backfillTrackPeaks`.
 */

/**
 * Only support tracks draw a waveform: music always draws the plain line
 * (redesign handoff `player.md` §1–2), so it isn't measured. That's 432 of
 * the 442 tracks and nearly all the decoding; measuring music later is this
 * function and a backfill re-run.
 */
export const drawsWaveform = (track: Pick<Doc<"audio_tracks">, "family">) =>
	track.family === "support";

/** Measure a support track's peaks in the background, after `delayMs`. */
export async function measurePeaksLater(
	ctx: MutationCtx,
	track: Pick<Doc<"audio_tracks">, "_id" | "family">,
	delayMs = 0
) {
	if (drawsWaveform(track)) {
		await ctx.scheduler.runAfter(delayMs, internal.audio.measurePeaks.measure, {
			trackId: track._id,
		});
	}
}

/** The audio to measure, or null when the track is gone, has its peaks, or doesn't draw a waveform. */
export const toMeasure = internalQuery({
	args: { trackId: v.id("audio_tracks") },
	handler: async (ctx, { trackId }) => {
		const track = await ctx.db.get("audio_tracks", trackId);
		if (!track || track.peaks !== undefined || !drawsWaveform(track)) {
			return null;
		}
		return {
			durationSec: track.durationSec,
			key: track.key,
			sha256: track.sha256,
			slug: track.slug,
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			durationSec: v.number(),
			key: v.string(),
			sha256: v.string(),
			slug: v.string(),
		})
	),
});

/**
 * Store peaks measured on the audio with this `sha256`. False, and nothing
 * written, when the track has been deleted or given other audio meanwhile:
 * that audio's own measure fills it.
 */
export const save = internalMutation({
	args: {
		peaks: trackPeaksValidator,
		sha256: v.string(),
		trackId: v.id("audio_tracks"),
	},
	handler: async (ctx, { peaks, sha256, trackId }) => {
		assertPeaks(peaks);
		const track = await ctx.db.get("audio_tracks", trackId);
		if (track?.sha256 !== sha256) {
			return false;
		}
		await ctx.db.patch("audio_tracks", trackId, { peaks });
		return true;
	},
	returns: v.boolean(),
});
