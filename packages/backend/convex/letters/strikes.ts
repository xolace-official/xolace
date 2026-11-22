/**
 * Strikes and the silent pause (#750): a held letter or a confirmed report is
 * one strike, and `STRIKES_TO_PAUSE` inside `STRIKE_WINDOW_DAYS` stop that
 * sender's letters being placed for `PAUSE_DAYS`. The sender is never told.
 */
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ensureLetterProfile } from "./profiles";
import {
	DAY_MS,
	PAUSE_DAYS,
	STRIKE_WINDOW_DAYS,
	STRIKES_TO_PAUSE,
} from "./rules";

export async function addStrike(
	ctx: MutationCtx,
	strike: {
		senderProfileId: Id<"emotional_profiles">;
		cause: "held" | "report";
		reviewId: Id<"letter_reviews">;
		at: number;
	}
): Promise<void> {
	await ctx.db.insert("letter_strikes", strike);

	const recent = await ctx.db
		.query("letter_strikes")
		.withIndex("by_sender_at", (q) =>
			q
				.eq("senderProfileId", strike.senderProfileId)
				.gt("at", strike.at - STRIKE_WINDOW_DAYS * DAY_MS)
		)
		.take(STRIKES_TO_PAUSE);
	if (recent.length < STRIKES_TO_PAUSE) {
		return;
	}

	const sender = await ensureLetterProfile(ctx, strike.senderProfileId);
	const until = strike.at + PAUSE_DAYS * DAY_MS;
	// A longer pause already in place (an admin's) stands.
	if ((sender.pausedUntil ?? 0) >= until) {
		return;
	}
	await ctx.db.patch("letter_profiles", sender._id, {
		pausedBy: "strikes",
		pausedUntil: until,
	});
}
