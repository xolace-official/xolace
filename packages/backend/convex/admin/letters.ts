/**
 * Letters moderation for Xolace staff (letters spec §9). Functions only:
 * `apps/admin` has no letters screen yet.
 *
 * An admin never sees who wrote a letter or who received it. They act on a
 * review id (or a pause's opaque ref) and the server finds the sender.
 * Reading a letter's words writes an audit row.
 */

import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ensureLetterProfile, letterProfileOf } from "../letters/profiles";
import { DAY_MS, PAUSE_DAYS, STRIKE_WINDOW_DAYS } from "../letters/rules";
import { addStrike } from "../letters/strikes";
import { reportReasonValidator } from "../letters/validators";
import { adminMutation, adminQuery } from "../lib/adminAuth";

/** Strikes counted per sender for a queue row or a pause; more reads as this. */
const STRIKES_SHOWN_MAX = 10;
/** The most active pauses one list returns. */
const PAUSES_LIST_MAX = 100;

const reviewKindValidator = v.union(v.literal("held"), v.literal("report"));

async function reviewOf(
	ctx: QueryCtx,
	reviewId: Id<"letter_reviews">
): Promise<{ review: Doc<"letter_reviews">; letter: Doc<"letters"> | null }> {
	const review = await ctx.db.get("letter_reviews", reviewId);
	if (!review) {
		throw new ConvexError({
			code: "review_not_found",
			message: "Review not found",
		});
	}
	return { letter: await ctx.db.get("letters", review.letterId), review };
}

/**
 * The sender behind a review: the letter's, or the review's own once a wipe
 * cut them from the letter. `undefined` once they deleted their account.
 */
function senderBehind(
	review: Doc<"letter_reviews">,
	letter: Doc<"letters"> | null
): Id<"emotional_profiles"> | undefined {
	return letter?.senderProfileId ?? review.senderProfileId;
}

/** The sender behind a review, or `sender_gone` once they deleted their account. */
async function senderOf(
	ctx: QueryCtx,
	reviewId: Id<"letter_reviews">
): Promise<Id<"emotional_profiles">> {
	const { letter, review } = await reviewOf(ctx, reviewId);
	const sender = senderBehind(review, letter);
	if (!sender) {
		throw new ConvexError({
			code: "sender_gone",
			message: "This letter's sender no longer has an account",
		});
	}
	return sender;
}

/** A sender's strikes inside the window, up to `STRIKES_SHOWN_MAX`. */
async function strikesOf(
	ctx: QueryCtx,
	senderProfileId: Id<"emotional_profiles">,
	before: number
): Promise<number> {
	const strikes = await ctx.db
		.query("letter_strikes")
		.withIndex("by_sender_at", (q) =>
			q
				.eq("senderProfileId", senderProfileId)
				.gt("at", before - STRIKE_WINDOW_DAYS * DAY_MS)
				.lt("at", before)
		)
		.take(STRIKES_SHOWN_MAX);
	return strikes.length;
}

/**
 * Open reviews, oldest first. No text and no one's identity; `priorStrikes`
 * is the sender's strikes in the 90 days before the review.
 */
export const listQueue = adminQuery({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		const result = await ctx.db
			.query("letter_reviews")
			.withIndex("by_state_created", (q) => q.eq("state", "open"))
			.paginate(args.paginationOpts);
		const page = [];
		for (const review of result.page) {
			const letter = await ctx.db.get("letters", review.letterId);
			const sender = senderBehind(review, letter);
			page.push({
				createdAt: review.createdAt,
				kind: review.kind,
				priorStrikes: sender
					? await strikesOf(ctx, sender, review.createdAt)
					: 0,
				reviewId: review._id,
				...(review.reason && { reason: review.reason }),
			});
		}
		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			page,
		};
	},
	returns: v.object({
		continueCursor: v.string(),
		isDone: v.boolean(),
		page: v.array(
			v.object({
				createdAt: v.number(),
				kind: reviewKindValidator,
				priorStrikes: v.number(),
				reason: v.optional(reportReasonValidator),
				reviewId: v.id("letter_reviews"),
			})
		),
	}),
});

/** The sender's Clerk id, for the audit row, while they still have an account. */
async function senderClerkId(
	ctx: QueryCtx,
	senderProfileId: Id<"emotional_profiles"> | undefined
): Promise<string | undefined> {
	if (!senderProfileId) {
		return;
	}
	const user = await ctx.db
		.query("users")
		.withIndex("by_emotional_profile", (q) =>
			q.eq("emotionalProfileId", senderProfileId)
		)
		.unique();
	return user?.authProviderAccountId;
}

/**
 * One review's letter, words included. A mutation so every read writes its
 * audit row (which admin, whose words, which review, when). `null` once the
 * letter itself is gone.
 */
export const openReview = adminMutation({
	args: { reviewId: v.id("letter_reviews") },
	handler: async (ctx, args) => {
		const { letter, review } = await reviewOf(ctx, args.reviewId);
		const target = await senderClerkId(ctx, senderBehind(review, letter));
		await ctx.db.insert("admin_audit_log", {
			action: "letter_viewed",
			adminClerkUserId: ctx.identity.subject,
			at: Date.now(),
			letterReviewId: review._id,
			...(target && { targetClerkUserId: target }),
		});
		if (!letter) {
			return null;
		}
		return {
			kind: review.kind,
			state: review.state,
			text: letter.text,
			...(review.reason && { reason: review.reason }),
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			kind: reviewKindValidator,
			reason: v.optional(reportReasonValidator),
			state: v.union(
				v.literal("open"),
				v.literal("confirmed"),
				v.literal("dismissed")
			),
			text: v.string(),
		})
	),
});

/** Drop the strike a held letter earned, when a person finds it wasn't. */
async function dropStrikeFor(
	ctx: MutationCtx,
	review: Doc<"letter_reviews">,
	senderProfileId: Id<"emotional_profiles"> | undefined
): Promise<void> {
	if (!senderProfileId) {
		return;
	}
	for await (const strike of ctx.db
		.query("letter_strikes")
		.withIndex("by_sender_at", (q) =>
			q.eq("senderProfileId", senderProfileId).eq("at", review.createdAt)
		)) {
		if (strike.reviewId === review._id) {
			await ctx.db.delete("letter_strikes", strike._id);
		}
	}
}

/**
 * Decide an open review. Confirming a report is a strike (two in 90 days
 * pause the sender, silently). A held letter was struck when it was held;
 * dismissing it takes that strike back (a pause it caused isn't lifted with
 * it: it runs to `pausedUntil` unless an admin lifts it). A dismissed held
 * letter is still never placed.
 */
export const decide = adminMutation({
	args: {
		decision: v.union(v.literal("confirm"), v.literal("dismiss")),
		reviewId: v.id("letter_reviews"),
	},
	handler: async (ctx, args) => {
		const { letter, review } = await reviewOf(ctx, args.reviewId);
		if (review.state !== "open") {
			throw new ConvexError({
				code: "review_decided",
				message: "This review was already decided",
			});
		}
		const now = Date.now();
		await ctx.db.patch("letter_reviews", review._id, {
			decidedAt: now,
			decidedBy: ctx.identity.subject,
			state: args.decision === "confirm" ? "confirmed" : "dismissed",
		});
		const sender = senderBehind(review, letter);
		if (args.decision === "confirm" && review.kind === "report" && sender) {
			await addStrike(ctx, {
				at: now,
				cause: "report",
				reviewId: review._id,
				senderProfileId: sender,
			});
		}
		if (args.decision === "dismiss" && review.kind === "held") {
			await dropStrikeFor(ctx, review, sender);
		}
		return null;
	},
	returns: v.null(),
});

/** Pause the sender behind a review for `PAUSE_DAYS`. Silent to them. */
export const pauseSender = adminMutation({
	args: { reviewId: v.id("letter_reviews") },
	handler: async (ctx, args) => {
		const row = await ensureLetterProfile(
			ctx,
			await senderOf(ctx, args.reviewId)
		);
		const until = Date.now() + PAUSE_DAYS * DAY_MS;
		await ctx.db.patch("letter_profiles", row._id, {
			pausedBy: "admin",
			pausedUntil: Math.max(until, row.pausedUntil ?? 0),
		});
		return null;
	},
	returns: v.null(),
});

/** Lift a pause, by the review that led to it or by a pause's ref. */
export const liftPause = adminMutation({
	args: {
		pauseRef: v.optional(v.id("letter_profiles")),
		reviewId: v.optional(v.id("letter_reviews")),
	},
	handler: async (ctx, args) => {
		let row: Doc<"letter_profiles"> | null = null;
		if (args.pauseRef) {
			row = await ctx.db.get("letter_profiles", args.pauseRef);
		} else if (args.reviewId) {
			row = await letterProfileOf(ctx, await senderOf(ctx, args.reviewId));
		} else {
			throw new ConvexError({
				code: "invalid_args",
				message: "Pass a pauseRef or a reviewId",
			});
		}
		if (row) {
			await ctx.db.patch("letter_profiles", row._id, {
				pausedBy: undefined,
				pausedUntil: undefined,
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Active pauses, soonest to end first. `pauseRef` is opaque (not a profile
 * id); `strikes` counts the 90 days to now.
 */
export const listPauses = adminQuery({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const rows = await ctx.db
			.query("letter_profiles")
			.withIndex("by_paused_until", (q) => q.gt("pausedUntil", now))
			.take(PAUSES_LIST_MAX);
		const pauses = [];
		for (const row of rows) {
			pauses.push({
				pausedBy: row.pausedBy ?? "strikes",
				pauseRef: row._id,
				strikes: await strikesOf(ctx, row.emotionalProfileId, now + 1),
				until: row.pausedUntil ?? now,
			});
		}
		return pauses;
	},
	returns: v.array(
		v.object({
			pausedBy: v.union(v.literal("strikes"), v.literal("admin")),
			pauseRef: v.id("letter_profiles"),
			strikes: v.number(),
			until: v.number(),
		})
	),
});
