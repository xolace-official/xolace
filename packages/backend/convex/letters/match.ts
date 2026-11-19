/**
 * Picking a recipient (spec §5.2). Reads the ready pool in index order (the
 * longest since a letter first, then a random tiebreak) and gives the letter
 * to the first candidate who passes the live checks. Never places an
 * unchecked or held letter, and never a paused sender's (silently, #750).
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { quietWindowEndsAt } from "../outreach/quietWindow";
import { captureLetterEvent, waitBucketOf } from "./analytics";
import { letterProfileOf } from "./profiles";
import { AIM_WINDOW_MS, CANDIDATES_PER_READ } from "./rules";

/** Follow-up states a person can still see and answer. */
const OPEN_FOLLOW_UP = ["pending", "ready", "shown", "superseded"] as const;
const BANDS = ["heavier", "lighter"] as const;

export type PlaceResult =
	/** Placed with a recipient; both pushes are scheduled. */
	| "placed"
	/** No candidate passed; still waiting. `poolEmpty`: none were even read. */
	| { none: true; poolEmpty: boolean }
	/** The sender is paused; still waiting, skipped silently. */
	| "paused"
	/** Not a waiting letter (any more). */
	| "gone";

/** An open acute or escalation-derived follow-up: no letter now (#749). */
async function hasOpenHardFollowUp(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<boolean> {
	for (const status of OPEN_FOLLOW_UP) {
		for await (const card of ctx.db
			.query("follow_up_cards")
			.withIndex("by_profile_status", (q) =>
				q.eq("emotionalProfileId", emotionalProfileId).eq("status", status)
			)) {
			if (card.tier === "acute" || card.escalationDerived) {
				return true;
			}
		}
	}
	return false;
}

/** The checks that change by the minute, run on each candidate at placement. */
async function passesLiveChecks(
	ctx: MutationCtx,
	candidate: Doc<"letter_profiles">,
	senderProfileId: Id<"emotional_profiles">,
	now: number
): Promise<boolean> {
	const recipientProfileId = candidate.emotionalProfileId;
	if (recipientProfileId === senderProfileId) {
		return false;
	}
	const block = await ctx.db
		.query("letter_blocks")
		.withIndex("by_pair", (q) =>
			q
				.eq("recipientProfileId", recipientProfileId)
				.eq("senderProfileId", senderProfileId)
		)
		.first();
	if (block) {
		return false;
	}
	const preferences = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", recipientProfileId)
		)
		.unique();
	// Skipped, not reserved: someone else may fit now (#749).
	if (quietWindowEndsAt(preferences?.notifications, now) !== null) {
		return false;
	}
	return !(await hasOpenHardFollowUp(ctx, recipientProfileId));
}

/** The ready rows one read offers, in the order matching takes them. */
function readyCandidates(
	ctx: MutationCtx,
	letter: Doc<"letters">,
	band: (typeof BANDS)[number],
	inAimWindow: boolean
) {
	const aim = letter.aim;
	if (aim && inAimWindow) {
		return ctx.db
			.query("letter_profiles")
			.withIndex("by_pool_aim", (q) =>
				q
					.eq("pool", "ready")
					.eq("language", letter.language)
					.eq("aim", aim)
					.eq("band", band)
			)
			.take(CANDIDATES_PER_READ);
	}
	return ctx.db
		.query("letter_profiles")
		.withIndex("by_pool_band", (q) =>
			q.eq("pool", "ready").eq("language", letter.language).eq("band", band)
		)
		.take(CANDIDATES_PER_READ);
}

/** Give the letter to its recipient and tell both sides. */
async function give(
	ctx: MutationCtx,
	letter: Doc<"letters">,
	recipient: Doc<"letter_profiles">,
	senderProfileId: Id<"emotional_profiles">,
	now: number
): Promise<void> {
	await ctx.db.patch("letters", letter._id, {
		receivedAt: now,
		recipientProfileId: recipient.emotionalProfileId,
		status: "received",
	});
	await ctx.db.patch("letter_profiles", recipient._id, {
		lastReceivedAt: now,
		pool: "out",
		// Back in after they open it (which refreshes the pool).
		poolCheckAt: undefined,
		tiebreak: Math.random(),
		unopenedLetterId: letter._id,
	});
	await ctx.scheduler.runAfter(0, internal.letters.push.send, {
		letterId: letter._id,
		to: recipient.emotionalProfileId,
		type: "letter_for_you",
	});
	await ctx.scheduler.runAfter(0, internal.letters.push.send, {
		letterId: letter._id,
		to: senderProfileId,
		type: "letter_received",
	});
	await captureLetterEvent(ctx, senderProfileId, {
		event: "letter_placed",
		properties: { waitBucket: waitBucketOf(now - (letter.checkedAt ?? now)) },
	});
}

/** Try to place one letter now. Reads its own writes, so a sweep can loop. */
export async function placeLetter(
	ctx: MutationCtx,
	letterId: Id<"letters">,
	now: number
): Promise<PlaceResult> {
	const letter = await ctx.db.get("letters", letterId);
	const senderProfileId = letter?.senderProfileId;
	if (
		!(letter && senderProfileId) ||
		letter.status !== "waiting" ||
		letter.checkedAt === undefined
	) {
		return "gone";
	}
	const sender = await letterProfileOf(ctx, senderProfileId);
	if ((sender?.pausedUntil ?? 0) > now) {
		return "paused";
	}

	const inAimWindow = now < letter.checkedAt + AIM_WINDOW_MS;
	let read = 0;
	for (const band of BANDS) {
		const candidates = await readyCandidates(ctx, letter, band, inAimWindow);
		read += candidates.length;
		for (const candidate of candidates) {
			if (await passesLiveChecks(ctx, candidate, senderProfileId, now)) {
				await give(ctx, letter, candidate, senderProfileId, now);
				return "placed";
			}
		}
	}
	// Only a band read speaks for the whole language's pool.
	return { none: true, poolEmpty: read === 0 && !(letter.aim && inAimWindow) };
}

export const place = internalMutation({
	args: { letterId: v.id("letters") },
	handler: async (ctx, args) => {
		const result = await placeLetter(ctx, args.letterId, Date.now());
		return result === "placed";
	},
	returns: v.boolean(),
});
