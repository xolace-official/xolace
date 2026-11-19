/**
 * What account deletion, a data wipe and retention do to letters (letters
 * spec §10, decision B). One `letters` row is both the sender's Sent row and
 * the recipient's letter, so each side lets go of its own end: a received
 * letter loses the departing side's profile id, and the row is deleted once
 * neither side holds it and no review is open.
 *
 * Every drain removes one bounded batch and says whether it was full, the
 * shape `jobs/accountDeletion.ts` calls each step in.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { letterProfileOf } from "./profiles";

type ProfileId = Id<"emotional_profiles">;

/** Rows of each table one pass handles. */
const BATCH = 100;

/** Delete a letter and every review of it. */
export async function deleteLetter(
	ctx: MutationCtx,
	letterId: Id<"letters">
): Promise<void> {
	for (const review of await ctx.db
		.query("letter_reviews")
		.withIndex("by_letter", (q) => q.eq("letterId", letterId))
		.take(BATCH)) {
		await ctx.db.delete("letter_reviews", review._id);
	}
	await ctx.db.delete("letters", letterId);
}

async function hasOpenReview(
	ctx: MutationCtx,
	letterId: Id<"letters">
): Promise<boolean> {
	for (const review of await ctx.db
		.query("letter_reviews")
		.withIndex("by_letter", (q) => q.eq("letterId", letterId))
		.take(BATCH)) {
		if (review.state === "open") {
			return true;
		}
	}
	return false;
}

/**
 * The sender lets go of a letter. A received letter its recipient can still
 * read stays with them, anonymous text with no account behind it. Anything
 * else is the sender's alone (waiting, unchecked, returned, held, or reported
 * and so gone from the recipient) and is deleted, with its reviews.
 *
 * Account deletion closes open reviews that way (decision B). Retention
 * passes `keepUnderReview`: a letter still waiting on a person's decision is
 * cut from the sender instead, and goes on its review's own clock.
 */
export async function releaseAsSender(
	ctx: MutationCtx,
	letter: Doc<"letters">,
	{ keepUnderReview = false } = {}
): Promise<void> {
	const recipientKeeps =
		letter.status === "received" &&
		letter.recipientProfileId !== undefined &&
		letter.reportedAt === undefined;
	if (
		recipientKeeps ||
		(keepUnderReview && (await hasOpenReview(ctx, letter._id)))
	) {
		await ctx.db.patch("letters", letter._id, { senderProfileId: undefined });
		return;
	}
	await deleteLetter(ctx, letter._id);
}

/**
 * The recipient lets go of a letter. The sender's Sent row keeps the status
 * it had; once there's no sender either, and no review still needs the words,
 * the row goes.
 */
export async function releaseAsRecipient(
	ctx: MutationCtx,
	letter: Doc<"letters">
): Promise<void> {
	if (
		letter.senderProfileId === undefined &&
		!(await hasOpenReview(ctx, letter._id))
	) {
		await deleteLetter(ctx, letter._id);
		return;
	}
	await ctx.db.patch("letters", letter._id, {
		hiddenAt: undefined,
		recipientProfileId: undefined,
	});
}

/**
 * The letters this profile sent, oldest first. Retention passes `before` (its
 * cutoff), and keeps letters under review.
 */
export async function drainSent(
	ctx: MutationCtx,
	profileId: ProfileId,
	before?: number
): Promise<boolean> {
	const letters = await ctx.db
		.query("letters")
		.withIndex("by_sender_created", (q) =>
			q
				.eq("senderProfileId", profileId)
				.lt("createdAt", before ?? Number.POSITIVE_INFINITY)
		)
		.take(BATCH);
	for (const letter of letters) {
		await releaseAsSender(ctx, letter, {
			keepUnderReview: before !== undefined,
		});
	}
	return letters.length === BATCH;
}

/** The letters this profile received, oldest first; `before` limits them by age. */
export async function drainReceived(
	ctx: MutationCtx,
	profileId: ProfileId,
	before = Number.POSITIVE_INFINITY
): Promise<boolean> {
	const letters = await ctx.db
		.query("letters")
		.withIndex("by_recipient_received", (q) =>
			q.eq("recipientProfileId", profileId).lt("receivedAt", before)
		)
		.take(BATCH);
	for (const letter of letters) {
		await releaseAsRecipient(ctx, letter);
	}
	return letters.length === BATCH;
}

/** Their reports stay for review, cut from their account. */
async function drainReports(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const reviews = await ctx.db
		.query("letter_reviews")
		.withIndex("by_reporter", (q) => q.eq("reporterProfileId", profileId))
		.take(BATCH);
	for (const review of reviews) {
		await ctx.db.patch("letter_reviews", review._id, {
			reporterProfileId: undefined,
		});
	}
	return reviews.length === BATCH;
}

/** The senders they hid or reported. */
async function drainOwnBlocks(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const blocks = await ctx.db
		.query("letter_blocks")
		.withIndex("by_pair", (q) => q.eq("recipientProfileId", profileId))
		.take(BATCH);
	for (const block of blocks) {
		await ctx.db.delete("letter_blocks", block._id);
	}
	return blocks.length === BATCH;
}

/** Other people's blocks of them, which mean nothing once the account is gone. */
async function drainBlocksOfThem(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const blocks = await ctx.db
		.query("letter_blocks")
		.withIndex("by_sender", (q) => q.eq("senderProfileId", profileId))
		.take(BATCH);
	for (const block of blocks) {
		await ctx.db.delete("letter_blocks", block._id);
	}
	return blocks.length === BATCH;
}

async function drainStrikes(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const strikes = await ctx.db
		.query("letter_strikes")
		.withIndex("by_sender_at", (q) => q.eq("senderProfileId", profileId))
		.take(BATCH);
	for (const strike of strikes) {
		await ctx.db.delete("letter_strikes", strike._id);
	}
	return strikes.length === BATCH;
}

/** Run every drain once; true if any may have more. */
async function drainAll(
	drains: readonly (() => Promise<boolean>)[]
): Promise<boolean> {
	let more = false;
	for (const drain of drains) {
		if (await drain()) {
			more = true;
		}
	}
	return more;
}

/**
 * Account deletion (decision B): their unplaced and held letters go, received
 * ones stay with their recipients cut from the account; letters they received
 * go from their side; their reports stay, cut from them; blocks either way,
 * strikes, a pause and the `letter_profiles` row go. The row goes last, once
 * every other drain is done.
 */
export async function drainLettersForDeletion(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const more = await drainAll([
		() => drainSent(ctx, profileId),
		() => drainReceived(ctx, profileId),
		() => drainReports(ctx, profileId),
		() => drainOwnBlocks(ctx, profileId),
		() => drainBlocksOfThem(ctx, profileId),
		() => drainStrikes(ctx, profileId),
	]);
	if (more) {
		return true;
	}
	const row = await letterProfileOf(ctx, profileId);
	if (row) {
		await ctx.db.delete("letter_profiles", row._id);
	}
	return false;
}

/**
 * A data wipe: deletion's letters, reports and their own blocks, but the
 * `letter_profiles` row stays with the opt-in, the locale and the day cap,
 * its pool state reset to out until a new session.
 *
 * Kept, unlike deletion: strikes, a pause, and other people's blocks of them.
 * Those record what others chose about this sender, and a wipe mustn't be a
 * way out of a pause or back to someone who hid them.
 */
export async function wipeLetters(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const more = await drainAll([
		() => drainSent(ctx, profileId),
		() => drainReceived(ctx, profileId),
		() => drainReports(ctx, profileId),
		() => drainOwnBlocks(ctx, profileId),
	]);
	if (more) {
		return true;
	}
	const row = await letterProfileOf(ctx, profileId);
	if (row) {
		await ctx.db.patch("letter_profiles", row._id, {
			aim: undefined,
			band: undefined,
			metadataAt: undefined,
			pool: "out",
			poolCheckAt: undefined,
			unopenedLetterId: undefined,
		});
	}
	return false;
}
