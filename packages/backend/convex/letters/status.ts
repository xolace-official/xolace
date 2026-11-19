/**
 * What the letters screens need to know about the caller, in one read.
 */
import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { letterProfileOf, writeLimitOf } from "./profiles";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const letterProfile = await letterProfileOf(ctx, profile._id);
		const optIn: "yes" | "no" | "unset" = letterProfile?.optIn ?? "unset";
		return {
			// Decision C: false while the waiting pool runs well ahead of
			// placements, so the session-end card stops asking for letters
			// nobody will receive. Always true until matching lands (slice 3).
			invite: true,
			// The sender's local day (YYYY-MM-DD, their timezone) of their last
			// letter, held ones included. Convex doesn't re-run this query when
			// the clock passes midnight, so a client compares it with its own
			// local day and treats `writeLimit: "today"` as lifted once they differ.
			lastSentDay: letterProfile?.lastSentDay ?? null,
			optIn,
			unopenedId:
				optIn === "yes" ? (letterProfile?.unopenedLetterId ?? null) : null,
			// As of this read: see `lastSentDay`.
			writeLimit: await writeLimitOf(ctx, profile, letterProfile),
		};
	},
	returns: v.object({
		invite: v.boolean(),
		lastSentDay: v.union(v.string(), v.null()),
		optIn: v.union(v.literal("unset"), v.literal("yes"), v.literal("no")),
		unopenedId: v.union(v.id("letters"), v.null()),
		writeLimit: v.union(v.literal("today"), v.literal("three"), v.null()),
	}),
});
