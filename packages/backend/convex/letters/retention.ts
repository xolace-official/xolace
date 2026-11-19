/**
 * How long letters are kept (letters spec §10, decision B).
 *
 * - Each person's retention setting applies to their own side: Sent rows and
 *   received letters past their cutoff (`purgeLettersPastCutoff`, called from
 *   `jobs/dataRetention.purgeProfilePastCutoff`).
 * - Reviewed text goes `REVIEW_KEEP_DAYS` after the decision, and an
 *   undecided review's at most `REVIEW_OPEN_MAX_DAYS` after it opened.
 * - Strikes go after `STRIKE_KEEP_DAYS`, when they can't pause anyone.
 * - `letter_viewed` audit rows go after `LETTER_VIEW_AUDIT_KEEP_DAYS`.
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
	LETTER_VIEW_AUDIT_KEEP_DAYS,
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
	const moreSent = await drainSent(ctx, profileId, "retention", cutoff);
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
 * A review's time is up, and its letter's text goes with it (decision B):
 * the recipient lost a reported letter when they reported it, and a held one
 * was never placed. That holds even while the sender still has the reported
 * letter in Sent. Only another review of the same letter, still open, keeps
 * the text for itself.
 */
async function expireReview(
	ctx: MutationCtx,
	review: Doc<"letter_reviews">
): Promise<void> {
	const others = await ctx.db
		.query("letter_reviews")
		.withIndex("by_letter", (q) => q.eq("letterId", review.letterId))
		.take(RUN_BATCH);
	if (others.some((o) => o._id !== review._id && o.state === "open")) {
		await ctx.db.delete("letter_reviews", review._id);
		return;
	}
	if (await ctx.db.get("letters", review.letterId)) {
		await deleteLetter(ctx, review.letterId);
		return;
	}
	await ctx.db.delete("letter_reviews", review._id);
}

/** Daily: reviewed text, strikes and `letter_viewed` audit rows past their time. */
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

		const views = await ctx.db
			.query("admin_audit_log")
			.withIndex("by_action_at", (q) =>
				q
					.eq("action", "letter_viewed")
					.lt("at", now - LETTER_VIEW_AUDIT_KEEP_DAYS * DAY_MS)
			)
			.take(RUN_BATCH);
		for (const view of views) {
			await ctx.db.delete("admin_audit_log", view._id);
		}

		if (
			decided.length === RUN_BATCH ||
			undecided.length === RUN_BATCH ||
			strikes.length === RUN_BATCH ||
			views.length === RUN_BATCH
		) {
			await ctx.scheduler.runAfter(0, internal.letters.retention.run, {});
		}
		return null;
	},
	returns: v.null(),
});
