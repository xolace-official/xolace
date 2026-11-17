import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../_generated/server";
import { trackPeaksValidator } from "../lib/validators";
import { assertPeaks } from "./peaks";

/**
 * `audio_tracks.peaks`, around the measuring action (`measurePeaks.ts`, which
 * needs Node for its decoder). Every path that gives a track new audio calls
 * `measurePeaksLater`: the admin's New track and Replace audio
 * (`admin/audio.ts`), and the shared upsert behind the Kindling script and
 * admin imports (`ai/paths/audioTracks.ts upsertTrackRecord`). Tracks from
 * before peaks existed get them from `migrations:backfillTrackPeaks`.
 */

/** Measure a track's peaks in the background, after `delayMs`. */
export async function measurePeaksLater(
	ctx: MutationCtx,
	trackId: Id<"audio_tracks">,
	delayMs = 0
) {
	await ctx.scheduler.runAfter(delayMs, internal.audio.measurePeaks.measure, {
		trackId,
	});
}

/** The audio to measure, or null when the track is gone or already has its peaks. */
export const toMeasure = internalQuery({
	args: { trackId: v.id("audio_tracks") },
	handler: async (ctx, { trackId }) => {
		const track = await ctx.db.get("audio_tracks", trackId);
		if (!track || track.peaks !== undefined) {
			return null;
		}
		return { key: track.key, sha256: track.sha256, slug: track.slug };
	},
	returns: v.union(
		v.null(),
		v.object({ key: v.string(), sha256: v.string(), slug: v.string() })
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
