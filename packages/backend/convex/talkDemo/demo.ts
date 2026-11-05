/**
 * Intake v2's Talk demo (#704, #714): a taste of Talk behind the Talk card on
 * the Xolace+ step. Not a talk: no session, no ElevenLabs agent, no talk time,
 * no Plus check, nothing on the timeline or in the Understanding, and no words
 * kept. Flux opens with a fixed line, the person says one thing, and Flux asks
 * one deeper question back (`ai/talkDemo/reply`).
 *
 * The limits live here, on the person's one `talk_demos` row: one turn, within
 * {@link DEMO_CAP_MS} of opening, and once that turn is claimed, no other demo.
 * A demo closed before anything was said can open again, and one the safeguard
 * ended opens only on crisis support: the person may have closed it before that
 * answer reached them (`open`).
 */
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
} from "../_generated/server";
import { CRISIS_RESOURCES } from "../ai/safeguard";
import { requireAuth } from "../lib/auth";

export const DEMO_OPENING =
	"Before the Mirror names it, talk it through with me. I'll ask, you answer, and we get underneath it together. Try me.";

/** From opening to the one turn: room to pick a voice and say a sentence, not to keep it open. */
export const DEMO_CAP_MS = 3 * 60 * 1000;

/**
 * How long a claimed turn may go without reporting how it ended: past the
 * safeguard's and the writer's limits (`ai/talkDemo/reply`). Beyond it the action
 * died, and the turn is just spent.
 */
export const DEMO_SETTLE_MS = 30 * 1000;

const demoOf = (ctx: MutationCtx, profileId: Id<"emotional_profiles">) =>
	ctx.db
		.query("talk_demos")
		.withIndex("by_emotionalProfileId", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.unique();

/**
 * The demo opens (again, if nothing was said in it): its clock starts now. Once
 * its one turn was claimed it won't, and the code says what to show instead:
 * - `demo_safety`: the safeguard ended it, so crisis support, nothing sold. The
 *   level isn't kept, so this carries the fullest list.
 * - `demo_settling`: that turn is still running and could yet end on support, so
 *   nothing can be said yet. Ask again shortly.
 * - `demo_used`: it was tried.
 *
 * A build from before these codes reads the first two as "Flux couldn't answer",
 * which sells nothing either.
 */
export const open = mutation({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const demo = await demoOf(ctx, profile._id);
		if (demo?.spokeAt !== undefined) {
			if (demo.endedBy === "safety") {
				throw new ConvexError({
					code: "demo_safety",
					message: "The Talk demo ended on crisis support",
					resources: CRISIS_RESOURCES,
				});
			}
			if (
				demo.endedBy === undefined &&
				Date.now() - demo.spokeAt < DEMO_SETTLE_MS
			) {
				throw new ConvexError({
					code: "demo_settling",
					message: "The Talk demo's turn hasn't finished",
				});
			}
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
		if (demo.spokeAt !== undefined) {
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
