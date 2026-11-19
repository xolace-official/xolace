/**
 * How long letters are kept (letters spec §10, decision B).
 *
 * - Each person's retention setting applies to their own side: Sent rows and
 *   received letters past their cutoff (`purgeLettersPastCutoff`, called from
 *   `jobs/dataRetention.purgeProfilePastCutoff`).
 * - Reviewed text goes `REVIEW_KEEP_DAYS` after the decision, and an
 *   undecided review's at most `REVIEW_OPEN_MAX_DAYS` after it opened.
 * - Strikes go after `STRIKE_KEEP_DAYS`, when they can't pause anyone.
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { deleteLetter, drainReceived, drainSent } from "./erasure";
import { refreshPool } from "./pool";
import { letterProfileOf } from "./profiles";
import {
	DAY_MS,
	REVIEW_KEEP_DAYS,
	REVIEW_OPEN_MAX_DAYS,
	ERASE_BATCH as RUN_BATCH,
	STRIKE_KEEP_DAYS,
} from "./rules";

/**
 * One bounded pass of a profile's letters past `cutoff`: what they sent
 * before it, and what they received before it. A letter that held their
 * unopened slot frees it.
 *
 * @returns whether another pass may delete more.
 */
export async function purgeLettersPastCutoff(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">,
	cutoff: number,
	now: number
): Promise<boolean> {
	const moreSent = await drainSent(ctx, profileId, cutoff);
	const moreReceived = await drainReceived(ctx, profileId, cutoff);
	const row = await letterProfileOf(ctx, profileId);
	if (row?.unopenedLetterId) {
		const unopened = await ctx.db.get("letters", row.unopenedLetterId);
		if (unopened?.recipientProfileId !== profileId) {
			await ctx.db.patch("letter_profiles", row._id, {
				unopenedLetterId: undefined,
			});
			await refreshPool(ctx, profileId, now);
		}
	}
	return moreSent || moreReceived;
}

/**
 * A review's time is up. A held letter goes with it (its sender never sees
 * it). A reported one goes too once nobody holds it: no sender, and the
 * recipient lost it when they reported it. While its sender has an account
 * it's still their own Sent row, and stays.
 */
async function expireReview(
	ctx: MutationCtx,
	review: Doc<"letter_reviews">
): Promise<void> {
	const letter = await ctx.db.get("letters", review.letterId);
	if (letter && (review.kind === "held" || !letter.senderProfileId)) {
		await deleteLetter(ctx, letter._id);
		return;
	}
	await ctx.db.delete("letter_reviews", review._id);
}

/** Daily: reviewed text past its time, and strikes past theirs. */
export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const decided = await ctx.db
			.query("letter_reviews")
			.withIndex("by_decided", (q) =>
				q.gte("decidedAt", 0).lt("decidedAt", now - REVIEW_KEEP_DAYS * DAY_MS)
			)
			.take(RUN_BATCH);
		const undecided = await ctx.db
			.query("letter_reviews")
			.withIndex("by_state_created", (q) =>
				q
					.eq("state", "open")
					.lt("createdAt", now - REVIEW_OPEN_MAX_DAYS * DAY_MS)
			)
			.take(RUN_BATCH);
		for (const review of [...decided, ...undecided]) {
			// Deleting a letter takes its other reviews with it.
			if (await ctx.db.get("letter_reviews", review._id)) {
				await expireReview(ctx, review);
			}
		}

		const strikes = await ctx.db
			.query("letter_strikes")
			.withIndex("by_at", (q) => q.lt("at", now - STRIKE_KEEP_DAYS * DAY_MS))
			.take(RUN_BATCH);
		for (const strike of strikes) {
			await ctx.db.delete("letter_strikes", strike._id);
		}

		if (
			decided.length === RUN_BATCH ||
			undecided.length === RUN_BATCH ||
			strikes.length === RUN_BATCH
		) {
			await ctx.scheduler.runAfter(0, internal.letters.retention.run, {});
		}
		return null;
	},
	returns: v.null(),
});
