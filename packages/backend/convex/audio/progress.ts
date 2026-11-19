import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
} from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Where someone is in a support track (B6), kept so Explore's "Pick up where
 * you left off" can offer it again (`browse/explore.ts`). Separate from
 * `listens.recordListen`, which logs a play once for the streak; this one is
 * written over and over while the track plays.
 */

/** Below this far in, nothing is kept: a tap-and-skip isn't something to resume. */
export const MIN_RESUME_SEC = 5;
/** This far through counts as finished, so the closing silence doesn't leave a card. */
export const FINISHED_FRACTION = 0.95;
/** Rows drained per wipe or deletion pass. */
const DRAIN_BATCH = 200;

export const progressRow = (
	ctx: QueryCtx,
	profileId: Id<"emotional_profiles">,
	trackId: Id<"audio_tracks">
) =>
	ctx.db
		.query("listen_progress")
		.withIndex("by_emotionalProfileId_and_trackId", (q) =>
			q.eq("emotionalProfileId", profileId).eq("trackId", trackId)
		)
		.unique();

/**
 * The player's position update: call it every so often while a track plays,
 * on pause, and at the end (`finished: true`, or a position past
 * `FINISHED_FRACTION`). A finished track comes back to Continue only when it's
 * played past `MIN_RESUME_SEC` again. Music, an unknown track, and a position
 * under `MIN_RESUME_SEC` with nothing kept yet write nothing.
 */
export const record = mutation({
	args: {
		finished: v.optional(v.literal(true)),
		positionSec: v.number(),
		trackId: v.id("audio_tracks"),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const track = await ctx.db.get("audio_tracks", args.trackId);
		if (!track || track.family !== "support") {
			return null;
		}
		// v.number() lets NaN and ±Infinity through.
		const asked = Number.isFinite(args.positionSec) ? args.positionSec : 0;
		const positionSec = Math.min(Math.max(asked, 0), track.durationSec);
		const finished =
			args.finished === true ||
			positionSec >= track.durationSec * FINISHED_FRACTION;
		const now = Date.now();

		const row = await progressRow(ctx, profile._id, args.trackId);
		if (!row) {
			if (finished || positionSec < MIN_RESUME_SEC) {
				return null;
			}
			await ctx.db.insert("listen_progress", {
				emotionalProfileId: profile._id,
				positionSec,
				trackId: args.trackId,
				updatedAt: now,
			});
			return null;
		}

		const patch: Partial<Doc<"listen_progress">> = { updatedAt: now };
		if (finished) {
			patch.positionSec = track.durationSec;
			patch.finishedAt = row.finishedAt ?? now;
		} else if (row.finishedAt === undefined) {
			patch.positionSec = positionSec;
		} else {
			// The player rewinding to the start after the end isn't a new listen.
			if (positionSec < MIN_RESUME_SEC) {
				return null;
			}
			patch.positionSec = positionSec;
			patch.finishedAt = undefined;
		}
		await ctx.db.patch("listen_progress", row._id, patch);
		return null;
	},
	returns: v.null(),
});

/** Wipe and account deletion: one batch of this person's rows; true while more remain. */
export async function drainListenProgress(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">
): Promise<boolean> {
	const rows = await ctx.db
		.query("listen_progress")
		.withIndex("by_emotionalProfileId_and_trackId", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.take(DRAIN_BATCH);
	for (const r of rows) {
		await ctx.db.delete("listen_progress", r._id);
	}
	return rows.length === DRAIN_BATCH;
}
