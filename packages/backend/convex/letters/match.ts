/**
 * Picking a recipient (spec §5.2). Reads the ready pool in index order (the
 * longest since a letter first, then a random tiebreak) and gives the letter
 * to the first candidate who passes the live checks. Never places an
 * unchecked or held letter, and never a paused sender's (silently, #750).
 *
 * A candidate turned away for something about them (quiet hours, an open hard
 * follow-up, an account being deleted) is refreshed out of the pool until it
 * clears, so the next letter doesn't read them again. One turned away only for
 * this sender (their own letter, a block) stays for other senders.
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { captureLetterEvent, waitBucketOf } from "./analytics";
import { awayUntil, mayReceive, refreshPool } from "./pool";
import { letterProfileOf } from "./profiles";
import {
	AIM_WINDOW_MS,
	CANDIDATES_TRIED_MAX,
	recipientPushDelay,
} from "./rules";

const BANDS = ["heavier", "lighter"] as const;

export type PlaceResult =
	/** Placed with a recipient; both pushes are scheduled. */
	| "placed"
	/**
	 * No candidate passed; still waiting. `aimOnly`: only the letter's aim was
	 * read (inside its aim window), so this says nothing about other letters.
	 */
	| { none: true; aimOnly: boolean }
	/** The sender is paused; still waiting, skipped silently. */
	| "paused"
	/** Not a waiting letter (any more). */
	| "gone";

/**
 * Why a candidate can't have this letter now: `"pair"` for this sender only
 * (their own letter, a block), `"person"` for anyone's (see the module doc).
 */
async function turnedAway(
	ctx: MutationCtx,
	candidate: Doc<"letter_profiles">,
	senderProfileId: Id<"emotional_profiles">,
	now: number
): Promise<"pair" | "person" | null> {
	const recipientProfileId = candidate.emotionalProfileId;
	if (recipientProfileId === senderProfileId) {
		return "pair";
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
		return "pair";
	}
	// Live, not just as of the last refresh: an account deleted or wiped a
	// minute ago never receives, and its sender is never told it did.
	if (!(await mayReceive(ctx, candidate))) {
		return "person";
	}
	return (await awayUntil(ctx, recipientProfileId, now)) === null
		? null
		: "person";
}

/** The ready rows, in the order matching takes them, read as they're tried. */
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
			);
	}
	return ctx.db
		.query("letter_profiles")
		.withIndex("by_pool_band", (q) =>
			q.eq("pool", "ready").eq("language", letter.language).eq("band", band)
		);
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
	// Later, at random, so the two pushes can't be matched up (spec §6).
	await ctx.scheduler.runAfter(
		recipientPushDelay(),
		internal.letters.push.send,
		{
			letterId: letter._id,
			to: recipient.emotionalProfileId,
			type: "letter_for_you",
		}
	);
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
	const away: Id<"emotional_profiles">[] = [];
	let chosen: Doc<"letter_profiles"> | null = null;
	for (const band of BANDS) {
		let tried = 0;
		for await (const candidate of readyCandidates(
			ctx,
			letter,
			band,
			inAimWindow
		)) {
			const why = await turnedAway(ctx, candidate, senderProfileId, now);
			if (why === null) {
				chosen = candidate;
				break;
			}
			if (why === "person") {
				away.push(candidate.emotionalProfileId);
			}
			tried += 1;
			if (tried >= CANDIDATES_TRIED_MAX) {
				break;
			}
		}
		if (chosen) {
			break;
		}
	}
	// After the reads, so no row moves under the index walk.
	for (const id of away) {
		await refreshPool(ctx, id, now);
	}
	if (chosen) {
		await give(ctx, letter, chosen, senderProfileId, now);
		return "placed";
	}
	return { aimOnly: Boolean(letter.aim && inAimWindow), none: true };
}

export const place = internalMutation({
	args: { letterId: v.id("letters") },
	handler: async (ctx, args) => {
		const result = await placeLetter(ctx, args.letterId, Date.now());
		return result === "placed";
	},
	returns: v.boolean(),
});
