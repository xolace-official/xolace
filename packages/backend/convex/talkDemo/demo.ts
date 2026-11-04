/**
 * Intake v2's Talk demo (#704, #714): a taste of Talk behind the Talk card on
 * the Xolace+ step. Not a talk: no session, no ElevenLabs agent, no talk time,
 * no Plus check, nothing on the timeline or in the Understanding, and no words
 * kept. Flux opens with a fixed line, the person says one thing, and Flux asks
 * one deeper question back (`ai/talkDemo/reply`).
 *
 * The limits live here, on the person's one `talk_demos` row: one turn, within
 * {@link DEMO_CAP_MS} of opening, and once that turn is claimed, no other demo.
 * A demo closed before anything was said can open again.
 */
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
} from "../_generated/server";
import { requireAuth } from "../lib/auth";

export const DEMO_OPENING =
	"Before the Mirror names it, talk it through with me. I'll ask, you answer, and we get underneath it together. Try me.";

/** From opening to the one turn: room to pick a voice and say a sentence, not to keep it open. */
export const DEMO_CAP_MS = 3 * 60 * 1000;

const demoOf = (ctx: MutationCtx, profileId: Id<"emotional_profiles">) =>
	ctx.db
		.query("talk_demos")
		.withIndex("by_emotionalProfileId", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.unique();

/** Its one turn was claimed: neither another turn nor another demo from here. */
const spoken = (demo: Doc<"talk_demos"> | null) => demo?.spokeAt !== undefined;

/** The demo opens (again, if nothing was said in it): its clock starts now. */
export const open = mutation({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const demo = await demoOf(ctx, profile._id);
		if (spoken(demo)) {
			throw new ConvexError({
				code: "demo_used",
				message: "The Talk demo has been tried",
			});
		}
		const openedAt = Date.now();
		if (demo) {
			await ctx.db.patch("talk_demos", demo._id, { openedAt });
		} else {
			await ctx.db.insert("talk_demos", {
				emotionalProfileId: profile._id,
				openedAt,
			});
		}
		return { msLeft: DEMO_CAP_MS, opening: DEMO_OPENING };
	},
	returns: v.object({ msLeft: v.number(), opening: v.string() }),
});

/**
 * The one turn, claimed before anything is spent on it: two calls at once
 * can't both get a reply, and a failed reply still spends it.
 */
export const claimTurn = internalMutation({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const demo = await demoOf(ctx, profile._id);
		if (!demo) {
			throw new ConvexError({
				code: "demo_not_open",
				message: "Open the Talk demo first",
			});
		}
		if (spoken(demo)) {
			throw new ConvexError({
				code: "turn_taken",
				message: "The Talk demo has one turn",
			});
		}
		const now = Date.now();
		if (now - demo.openedAt > DEMO_CAP_MS) {
			throw new ConvexError({
				code: "demo_expired",
				message: "The Talk demo timed out",
			});
		}
		await ctx.db.patch("talk_demos", demo._id, { spokeAt: now });
		return demo._id;
	},
	returns: v.id("talk_demos"),
});

/** How the turn ended, for counting: never what was said. */
export const markEnded = internalMutation({
	args: {
		demoId: v.id("talk_demos"),
		endedBy: v.union(v.literal("reply"), v.literal("safety")),
	},
	handler: async (ctx, { demoId, endedBy }) => {
		await ctx.db.patch("talk_demos", demoId, { endedBy });
		return null;
	},
	returns: v.null(),
});

/** The spoken reply, once it has had its play. */
export const dropAudio = internalMutation({
	args: { storageId: v.id("_storage") },
	handler: async (ctx, { storageId }) => {
		await ctx.storage.delete(storageId);
		return null;
	},
	returns: v.null(),
});
