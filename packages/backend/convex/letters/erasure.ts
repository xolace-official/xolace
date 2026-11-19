/**
 * What account deletion, a data wipe and retention do to letters (letters
 * spec §10, decision B). One `letters` row is both the sender's Sent row and
 * the recipient's letter, so each side lets go of its own end: a received
 * letter loses the departing side's profile id, and the row is deleted once
 * neither side holds it and no review is open.
 *
 * A letter under an open review outlives its sender's side either way (owner,
 * 19 Nov 2026): a wipe or the retention setting moves the sender onto the
 * review, so a person can still strike or clear them; account deletion
 * closes the review as dismissed, and the text then goes on the decided
 * clock (`retention.ts`). A wipe or the retention setting also leaves a
 * server-only link on the letters recipients keep (`wipedSenderProfileId`),
 * so their hide or report still blocks and can strike; deletion removes it.
 *
 * Every drain removes one bounded batch and says whether it was full, the
 * shape `jobs/accountDeletion.ts` calls each step in.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { clerkUserIdOf } from "../jobs/clerkUserDeletion";
import { letterProfileOf } from "./profiles";
import { ERASE_BATCH as BATCH } from "./rules";

type ProfileId = Id<"emotional_profiles">;

/**
 * The Clerk user id a `letter_viewed` audit row names: account deletion's
 * `clerkUserIdOf`, from the verified `tokenIdentifier`. Writing and clearing
 * the audit target both go through here, so they always agree.
 */
export function auditClerkIdOf(user: Doc<"users"> | null): string | undefined {
	return (user && clerkUserIdOf(user.tokenIdentifier)) ?? undefined;
}

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

async function openReviewsOf(
	ctx: MutationCtx,
	letterId: Id<"letters">
): Promise<Doc<"letter_reviews">[]> {
	const reviews = await ctx.db
		.query("letter_reviews")
		.withIndex("by_letter", (q) => q.eq("letterId", letterId))
		.take(BATCH);
	return reviews.filter((review) => review.state === "open");
}

async function hasOpenReview(
	ctx: MutationCtx,
	letterId: Id<"letters">
): Promise<boolean> {
	return (await openReviewsOf(ctx, letterId)).length > 0;
}

/**
 * Close an open review because its sender deleted their account: dismissed,
 * so its text goes `REVIEW_KEEP_DAYS` later like any decided review's.
 * `decidedBy` stays unset: no person decided it.
 */
async function dismissForDeletion(
	ctx: MutationCtx,
	review: Doc<"letter_reviews">,
	now: number
): Promise<void> {
	await ctx.db.patch("letter_reviews", review._id, {
		decidedAt: now,
		senderProfileId: undefined,
		state: "dismissed",
	});
}

/**
 * How a sender lets go: `"deletion"` (their account is going), `"wipe"` (a
 * data wipe) or `"retention"` (their retention setting). On a wipe or
 * retention they stay a sender a person may strike.
 */
type SenderRelease = "deletion" | "wipe" | "retention";

/**
 * The sender lets go of a letter. A received letter its recipient can still
 * read stays with them, anonymous text with no account behind it. A letter
 * under an open review stays for it, cut from the sender: on a wipe or
 * retention the review keeps the sender, on deletion it closes as dismissed.
 * Anything else is the sender's alone (waiting, unchecked, returned, held, or
 * reported and so gone from the recipient) and is deleted, with its reviews.
 *
 * On a wipe or retention, a letter its recipient keeps holds the sender in
 * `wipedSenderProfileId`, server-only, so the recipient's hide or report still
 * blocks and can still lead to a strike (owner, 19 Nov 2026). Deletion leaves
 * no link.
 */
export async function releaseAsSender(
	ctx: MutationCtx,
	letter: Doc<"letters">,
	how: SenderRelease
): Promise<void> {
	const open = await openReviewsOf(ctx, letter._id);
	const now = Date.now();
	for (const review of open) {
		if (how === "deletion") {
			await dismissForDeletion(ctx, review, now);
		} else if (letter.senderProfileId) {
			// A wipe or retention: the review keeps them.
			await ctx.db.patch("letter_reviews", review._id, {
				senderProfileId: letter.senderProfileId,
			});
		}
	}
	const recipientKeeps =
		letter.status === "received" &&
		letter.recipientProfileId !== undefined &&
		letter.reportedAt === undefined;
	if (recipientKeeps || open.length > 0) {
		await ctx.db.patch("letters", letter._id, {
			senderProfileId: undefined,
			...(how !== "deletion" &&
				recipientKeeps && { wipedSenderProfileId: letter.senderProfileId }),
		});
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
 * cutoff).
 */
export async function drainSent(
	ctx: MutationCtx,
	profileId: ProfileId,
	how: SenderRelease,
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
		await releaseAsSender(ctx, letter, how);
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

/**
 * Reviews that hold this profile as their sender, after an earlier wipe cut
 * them from the letter. On deletion an open one closes as dismissed and a
 * decided one lets go of them.
 */
async function drainReviewsOfSender(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const reviews = await ctx.db
		.query("letter_reviews")
		.withIndex("by_sender", (q) => q.eq("senderProfileId", profileId))
		.take(BATCH);
	const now = Date.now();
	for (const review of reviews) {
		if (review.state === "open") {
			await dismissForDeletion(ctx, review, now);
		} else {
			await ctx.db.patch("letter_reviews", review._id, {
				senderProfileId: undefined,
			});
		}
	}
	return reviews.length === BATCH;
}

/** Received letters their wipe left linked to them, server-only: unlinked. */
async function drainWipedLinks(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const letters = await ctx.db
		.query("letters")
		.withIndex("by_wiped_sender", (q) =>
			q.eq("wipedSenderProfileId", profileId)
		)
		.take(BATCH);
	for (const letter of letters) {
		await ctx.db.patch("letters", letter._id, {
			wipedSenderProfileId: undefined,
		});
	}
	return letters.length === BATCH;
}

/**
 * `letter_viewed` audit rows keep which admin read which review, but not whose
 * words once the sender's account is gone: their Clerk id is cleared.
 * `outreach_viewed` rows aren't letters' to change.
 */
async function drainViewAudit(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_emotional_profile", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.unique();
	const clerkId = auditClerkIdOf(user);
	if (!clerkId) {
		return false;
	}
	const rows = await ctx.db
		.query("admin_audit_log")
		.withIndex("by_action_target", (q) =>
			q.eq("action", "letter_viewed").eq("targetClerkUserId", clerkId)
		)
		.take(BATCH);
	for (const row of rows) {
		await ctx.db.patch("admin_audit_log", row._id, {
			targetClerkUserId: undefined,
		});
	}
	return rows.length === BATCH;
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
 * ones stay with their recipients cut from the account, and ones under an
 * open review stay for it, the review closed as dismissed. Letters they
 * received go from their side; their reports stay, cut from them; blocks
 * either way, strikes, a pause and the `letter_profiles` row go, and audit
 * rows of admins reading their letters lose their Clerk id. The row goes
 * last, once every other drain is done.
 */
export async function drainLettersForDeletion(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const more = await drainAll([
		() => drainSent(ctx, profileId, "deletion"),
		() => drainWipedLinks(ctx, profileId),
		() => drainReviewsOfSender(ctx, profileId),
		() => drainReceived(ctx, profileId),
		() => drainReports(ctx, profileId),
		() => drainOwnBlocks(ctx, profileId),
		() => drainBlocksOfThem(ctx, profileId),
		() => drainStrikes(ctx, profileId),
		() => drainViewAudit(ctx, profileId),
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
 * A data wipe: their letters (as deletion, except a letter under an open
 * review keeps its review, which now holds them as its sender) and their
 * reports' link to them. The `letter_profiles` row stays with the opt-in, the
 * locale and the day cap, its pool state reset to out until a new session.
 *
 * Kept, unlike deletion: strikes, a pause, other people's blocks of them, and
 * the blocks they made (owner, 19 Nov 2026). Strikes, pauses and others'
 * blocks record what others chose about this sender, and a wipe mustn't be a
 * way out of a pause or back to someone who hid them. Their own blocks keep
 * a sender they hid away from them.
 *
 * `language` stays: today it only comes from the locale. Once sessions write
 * it (slice 6), a wipe must reset it to the locale's, since it's then derived
 * from the sessions the wipe removed.
 */
export async function wipeLetters(
	ctx: MutationCtx,
	profileId: ProfileId
): Promise<boolean> {
	const more = await drainAll([
		() => drainSent(ctx, profileId, "wipe"),
		() => drainReceived(ctx, profileId),
		() => drainReports(ctx, profileId),
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
