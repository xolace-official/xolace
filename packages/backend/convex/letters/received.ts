/**
 * The recipient's side: the letters Xolace placed with the caller. Only the
 * words and the caller's own marks come back: never the sender, a date, the
 * aim, or why it was placed. A reported letter is gone from here at once.
 */
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { RECEIVED_LIST_MAX } from "./rules";
import { receivedLetterValidator } from "./validators";

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
