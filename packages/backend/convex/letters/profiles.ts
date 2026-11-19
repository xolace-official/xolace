/**
 * The `letter_profiles` row: one per person who answered the offer or sent a
 * letter. Helpers only; no client function returns the row.
 */
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { localDayKey } from "../streaks/activityLog";
import { profileTimezone } from "../streaks/state";
import { WAITING_MAX } from "./rules";

export function letterProfileOf(
	ctx: QueryCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<Doc<"letter_profiles"> | null> {
	return ctx.db
		.query("letter_profiles")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
}

/** The row, made with everything off if this person has none yet. */
export async function ensureLetterProfile(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<Doc<"letter_profiles">> {
	const existing = await letterProfileOf(ctx, emotionalProfileId);
	if (existing) {
		return existing;
	}
	const id = await ctx.db.insert("letter_profiles", {
		emotionalProfileId,
		lastReceivedAt: 0,
		pool: "out",
		tiebreak: Math.random(),
	});
	const made = await ctx.db.get("letter_profiles", id);
	if (!made) {
		throw new Error("letter_profiles insert vanished");
	}
	return made;
}

/** Today on the sender's own calendar, as streaks count it. */
export async function senderToday(
	ctx: QueryCtx,
	profile: Doc<"emotional_profiles">
): Promise<string> {
	return localDayKey(Date.now(), await profileTimezone(ctx, profile));
}

/** Letters this sender has waiting or unchecked, counted up to the cap. */
async function waitingCount(
	ctx: QueryCtx,
	senderProfileId: Id<"emotional_profiles">
): Promise<number> {
	let count = 0;
	for (const status of ["waiting", "unchecked"] as const) {
		const rows = await ctx.db
			.query("letters")
			.withIndex("by_sender_status", (q) =>
				q.eq("senderProfileId", senderProfileId).eq("status", status)
			)
			.take(WAITING_MAX);
		count += rows.length;
	}
	return count;
}

/**
 * Why this sender can't write now, if they can't: one already today (their
 * local day; a withdraw doesn't give it back), else three waiting. A pause
 * never shows here (#750: silent).
 */
export async function writeLimitOf(
	ctx: QueryCtx,
	profile: Doc<"emotional_profiles">,
	letterProfile: Doc<"letter_profiles"> | null
): Promise<"today" | "three" | null> {
	if (
		letterProfile?.lastSentDay !== undefined &&
		letterProfile.lastSentDay === (await senderToday(ctx, profile))
	) {
		return "today";
	}
	if ((await waitingCount(ctx, profile._id)) >= WAITING_MAX) {
		return "three";
	}
	return null;
}
