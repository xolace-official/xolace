/**
 * The sender's side: the Sent list and what a sender may do to their own
 * letters. A letter that isn't the caller's reads exactly like one that
 * doesn't exist: absent from lists, and every change to it does nothing.
 */
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { type MutationCtx, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { posthog } from "../posthog";
import {
	holdsWaitingSlot,
	MARK_SEEN_MAX,
	openingLine,
	SENT_LIST_MAX,
	SENT_LIST_READ_MAX,
	sentSeen,
	sentStatusOf,
} from "./rules";
import { sentLetterValidator } from "./validators";

/** The caller's own letter, or null for anyone else's or a missing one. */
async function ownLetter(
	ctx: MutationCtx,
	senderProfileId: Id<"emotional_profiles">,
	id: Id<"letters">
): Promise<Doc<"letters"> | null> {
	const letter = await ctx.db.get("letters", id);
	return letter?.senderProfileId === senderProfileId ? letter : null;
}

/**
 * Newest first, at most 50, from the newest {@link SENT_LIST_READ_MAX} rows.
 * Held letters never show (the sender kept their words).
 */
export const list = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const rows = [];
		const newest = await ctx.db
			.query("letters")
			.withIndex("by_sender_created", (q) =>
				q.eq("senderProfileId", profile._id)
			)
			.order("desc")
			.take(SENT_LIST_READ_MAX);
		for (const letter of newest) {
			const status = sentStatusOf(letter);
			if (status === null) {
				continue;
			}
			rows.push({
				id: letter._id,
				line: openingLine(letter.text),
				seen: sentSeen(letter),
				status,
			});
			if (rows.length >= SENT_LIST_MAX) {
				break;
			}
		}
		return rows;
	},
	returns: v.array(sentLetterValidator),
});

/**
 * Take back a letter that hasn't been placed: the row is deleted. The day's
 * letter isn't given back. A letter already placed answers `"received"`; one
 * already gone (or not the caller's) answers `"ok"`.
 */
export const withdraw = mutation({
	args: { id: v.id("letters") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const letter = await ownLetter(ctx, profile._id, args.id);
		if (!letter) {
			return "ok" as const;
		}
		if (letter.status === "received") {
			return "received" as const;
		}
		if (!holdsWaitingSlot(letter.status)) {
			return "ok" as const;
		}
		await ctx.db.delete("letters", letter._id);
		try {
			await posthog.capture(ctx, {
				distinctId: profile._id,
				event: "letter_withdrawn",
				properties: {},
			});
		} catch (error) {
			console.error("letter_withdrawn capture failed", error);
		}
		return "ok" as const;
	},
	returns: v.union(v.literal("ok"), v.literal("received")),
});

/** The sender has seen these rows' current statuses. */
export const markSeen = mutation({
	args: { ids: v.array(v.id("letters")) },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		for (const id of args.ids.slice(0, MARK_SEEN_MAX)) {
			const letter = await ownLetter(ctx, profile._id, id);
			const status = letter && sentStatusOf(letter);
			if (!(letter && status) || status === "waiting") {
				continue;
			}
			if (letter.senderSeen !== status) {
				await ctx.db.patch("letters", letter._id, { senderSeen: status });
			}
		}
		return null;
	},
	returns: v.null(),
});

/** A returned letter leaves Sent: its row is deleted (decision C). */
export const dismiss = mutation({
	args: { id: v.id("letters") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const letter = await ownLetter(ctx, profile._id, args.id);
		if (letter?.status === "returned") {
			await ctx.db.delete("letters", letter._id);
		}
		return null;
	},
	returns: v.null(),
});
