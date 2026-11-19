/**
 * What the letters screens need to know about the caller, in one read.
 */
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { letterProfileOf, writeLimitOf } from "./profiles";
import { lateRiskValidator } from "./validators";

export const get = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const letterProfile = await letterProfileOf(ctx, profile._id);
		const optIn: "yes" | "no" | "unset" = letterProfile?.optIn ?? "unset";
		return {
			// Decision C: false while the waiting pool runs well ahead of
			// placements, so the session-end card stops asking for letters
			// nobody will receive. The hourly sweep works it out; true until
			// it first runs.
			invite: (await ctx.db.query("letter_stats").first())?.invite ?? true,
			// The sender's local day (YYYY-MM-DD, their timezone) of their last
			// letter, held ones included. Convex doesn't re-run this query when
			// the clock passes midnight, so a client compares it with its own
			// local day and treats `writeLimit: "today"` as lifted once they differ.
			lastSentDay: letterProfile?.lastSentDay ?? null,
			// A late re-check found the sender at risk after they were told their
			// letter was on its way: show intake's care (crisis or support
			// resources by level) at this open, then call `lateRiskShown`.
			lateRisk: letterProfile?.lateRisk ?? null,
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
		lateRisk: v.union(lateRiskValidator, v.null()),
		optIn: v.union(v.literal("unset"), v.literal("yes"), v.literal("no")),
		unopenedId: v.union(v.id("letters"), v.null()),
		writeLimit: v.union(v.literal("today"), v.literal("three"), v.null()),
	}),
});

/**
 * The care for a late risk was shown: it doesn't show again. `shown` is the
 * level the client showed; a crisis raised since then stays until it's shown
 * too. Without `shown`, whatever is stored clears (S21 always passes it).
 */
export const lateRiskShown = mutation({
	args: { shown: v.optional(lateRiskValidator) },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const row = await letterProfileOf(ctx, profile._id);
		if (!row?.lateRisk) {
			return null;
		}
		if (args.shown === "elevated" && row.lateRisk === "crisis") {
			return null;
		}
		await ctx.db.patch("letter_profiles", row._id, { lateRisk: undefined });
		return null;
	},
	returns: v.null(),
});
