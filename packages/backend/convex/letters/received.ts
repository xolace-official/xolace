/**
 * The recipient's side: the letters Xolace placed with the caller. Only the
 * words and the caller's own marks come back: never the sender, a date, the
 * aim, or why it was placed. A reported letter is gone from here at once.
 */
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { type MutationCtx, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { captureLetterEvent } from "./analytics";
import { refreshPool } from "./pool";
import { letterProfileOf } from "./profiles";
import { RECEIVED_LIST_MAX } from "./rules";
import { receivedLetterValidator, reportReasonValidator } from "./validators";

function asReceived(letter: Doc<"letters">) {
	return {
		acknowledged: letter.acknowledgedAt !== undefined,
		hidden: letter.hiddenAt !== undefined,
		id: letter._id,
		opened: letter.openedAt !== undefined,
		text: letter.text,
	};
}

/** Newest first, at most 100, hidden ones included. */
export const list = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const rows = [];
		for await (const letter of ctx.db
			.query("letters")
			.withIndex("by_recipient_received", (q) =>
				q.eq("recipientProfileId", profile._id)
			)
			.order("desc")) {
			if (letter.reportedAt !== undefined) {
				continue;
			}
			rows.push(asReceived(letter));
			if (rows.length >= RECEIVED_LIST_MAX) {
				break;
			}
		}
		return rows;
	},
	returns: v.array(receivedLetterValidator),
});

/**
 * One received letter, or `null` when it's gone, reported, not the caller's,
 * or `id` isn't a letter id at all (a route param needn't be checked first).
 */
export const get = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const id = ctx.db.normalizeId("letters", args.id);
		const letter = id ? await ctx.db.get("letters", id) : null;
		if (
			!letter ||
			letter.recipientProfileId !== profile._id ||
			letter.reportedAt !== undefined
		) {
			return null;
		}
		return asReceived(letter);
	},
	returns: v.union(receivedLetterValidator, v.null()),
});

/**
 * The caller's received letter, or `letter_not_found`: another user's letter
 * and a reported one read exactly like one that doesn't exist.
 */
async function ownReceived(
	ctx: MutationCtx,
	id: Id<"letters">
): Promise<{ letter: Doc<"letters">; profileId: Id<"emotional_profiles"> }> {
	const { profile } = await requireAuth(ctx);
	const letter = await ctx.db.get("letters", id);
	if (
		!letter ||
		letter.recipientProfileId !== profile._id ||
		letter.reportedAt !== undefined
	) {
		throw new ConvexError({
			code: "letter_not_found",
			message: "Letter not found",
		});
	}
	return { letter, profileId: profile._id };
}

/**
 * The letter no longer holds the caller's one unopened slot, so they may
 * receive again once their week's rest is up.
 */
async function releaseUnopened(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">,
	letterId: Id<"letters">,
	now: number
): Promise<void> {
	const row = await letterProfileOf(ctx, profileId);
	if (row?.unopenedLetterId !== letterId) {
		return;
	}
	await ctx.db.patch("letter_profiles", row._id, {
		unopenedLetterId: undefined,
	});
	await refreshPool(ctx, profileId, now);
}

/** That sender is never matched to this recipient again (#750). */
async function block(
	ctx: MutationCtx,
	letter: Doc<"letters">,
	recipientProfileId: Id<"emotional_profiles">,
	cause: "hide" | "report",
	now: number
): Promise<void> {
	const senderProfileId = letter.senderProfileId;
	if (!senderProfileId) {
		return;
	}
	const existing = await ctx.db
		.query("letter_blocks")
		.withIndex("by_pair", (q) =>
			q
				.eq("recipientProfileId", recipientProfileId)
				.eq("senderProfileId", senderProfileId)
		)
		.first();
	if (!existing) {
		await ctx.db.insert("letter_blocks", {
			cause,
			createdAt: now,
			recipientProfileId,
			senderProfileId,
		});
	}
}

/** Mark a letter opened. Idempotent. */
export const open = mutation({
	args: { id: v.id("letters") },
	handler: async (ctx, args) => {
		const { letter, profileId } = await ownReceived(ctx, args.id);
		const now = Date.now();
		if (letter.openedAt === undefined) {
			await ctx.db.patch("letters", letter._id, { openedAt: now });
			await captureLetterEvent(ctx, profileId, { event: "letter_opened" });
		}
		await releaseUnopened(ctx, profileId, letter._id, now);
		return null;
	},
	returns: v.null(),
});

/**
 * Acknowledge a letter, once, without words. The sender hears that it
 * reached someone; nothing about who. Repeating it changes nothing.
 */
export const acknowledge = mutation({
	args: { id: v.id("letters") },
	handler: async (ctx, args) => {
		const { letter, profileId } = await ownReceived(ctx, args.id);
		if (letter.acknowledgedAt !== undefined) {
			return null;
		}
		const now = Date.now();
		await ctx.db.patch("letters", letter._id, {
			acknowledgedAt: now,
			openedAt: letter.openedAt ?? now,
		});
		await releaseUnopened(ctx, profileId, letter._id, now);
		if (letter.senderProfileId) {
			await ctx.scheduler.runAfter(0, internal.letters.push.send, {
				letterId: letter._id,
				to: letter.senderProfileId,
				type: "letter_acknowledged",
			});
		}
		await captureLetterEvent(ctx, profileId, { event: "letter_acknowledged" });
		return null;
	},
	returns: v.null(),
});

/**
 * Hide a letter from the caller's list. Its sender is never matched to them
 * again, and unhiding doesn't undo that.
 */
export const hide = mutation({
	args: { id: v.id("letters") },
	handler: async (ctx, args) => {
		const { letter, profileId } = await ownReceived(ctx, args.id);
		const now = Date.now();
		await block(ctx, letter, profileId, "hide", now);
		if (letter.hiddenAt === undefined) {
			await ctx.db.patch("letters", letter._id, { hiddenAt: now });
			await captureLetterEvent(ctx, profileId, { event: "letter_hidden" });
		}
		await releaseUnopened(ctx, profileId, letter._id, now);
		return null;
	},
	returns: v.null(),
});

/** Show a hidden letter again. The block stays. */
export const unhide = mutation({
	args: { id: v.id("letters") },
	handler: async (ctx, args) => {
		const { letter } = await ownReceived(ctx, args.id);
		if (letter.hiddenAt !== undefined) {
			await ctx.db.patch("letters", letter._id, { hiddenAt: undefined });
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Report a letter: it leaves the caller at once, its sender is blocked for
 * them, and a person reviews it. Never a strike on its own; the sender is
 * never told. Reporting it again changes nothing.
 */
export const report = mutation({
	args: { id: v.id("letters"), reason: reportReasonValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const letter = await ctx.db.get("letters", args.id);
		if (letter?.recipientProfileId === profile._id && letter.reportedAt) {
			return null;
		}
		const own = await ownReceived(ctx, args.id);
		const { profileId } = own;
		const now = Date.now();
		await ctx.db.patch("letters", args.id, { reportedAt: now });
		await block(ctx, own.letter, profileId, "report", now);
		await ctx.db.insert("letter_reviews", {
			createdAt: now,
			kind: "report",
			letterId: args.id,
			reason: args.reason,
			reporterProfileId: profileId,
			state: "open",
		});
		await releaseUnopened(ctx, profileId, args.id, now);
		await captureLetterEvent(ctx, profileId, {
			event: "letter_reported",
			properties: { reason: args.reason },
		});
		return null;
	},
	returns: v.null(),
});
