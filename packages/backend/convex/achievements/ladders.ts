import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { awardAchievement } from "./award";
import {
	type GoalCounter,
	ladderRungsThrough,
	ladderTop,
	nextStreakRungAfter,
	showingUpRungAt,
} from "./catalog";

/**
 * Award every rung of `counter`'s ladder that `count` has reached (#695).
 * Every rung up to it, not only the one it lands on, because a count can jump
 * (one session unlocking three areas). Rungs already held are skipped, and a
 * count that later drops (an area going cold, a data wipe) takes nothing back.
 */
export async function awardLadderRungs(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	counter: GoalCounter,
	count: number,
	earnedAt: number
): Promise<void> {
	for (const rung of ladderRungsThrough(counter, count)) {
		await awardAchievement(ctx, emotionalProfileId, rung, earnedAt);
	}
}

/**
 * The Read ladder after a piece is finished (#695): counts the different
 * pieces the user has finished, one `library_reads` row each, so a re-read
 * never counts twice. Call after the finish is written.
 */
export async function awardReadRungs(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	earnedAt: number
): Promise<void> {
	const finished = await ctx.db
		.query("library_reads")
		.withIndex("by_emotionalProfileId_and_finishedAt_and_lastReadAt", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId).gt("finishedAt", 0)
		)
		.take(ladderTop("pieces_read"));
	await awardLadderRungs(
		ctx,
		emotionalProfileId,
		"pieces_read",
		finished.length,
		earnedAt
	);
}

/**
 * Award the Showing up rung at `daysShowedUp`, if it lands on one (#694). The
 * counter only ever steps up by one, so it can't skip a rung.
 */
export async function awardShowingUpRung(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	daysShowedUp: number,
	earnedAt: number
): Promise<void> {
	const rung = showingUpRungAt(daysShowedUp);
	if (rung) {
		await awardAchievement(ctx, emotionalProfileId, rung, earnedAt);
	}
}

/**
 * Award every streak rung `longestStreak` crossed going from `from` to `to`
 * (#694): rung N is earned once `longestStreak ≥ N`. Only the newly crossed
 * range is checked, so a long run costs nothing on days it doesn't grow; the
 * rungs below `from` were earned live then, or come from the backfill (#686).
 */
export async function awardStreakRungs(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	longestStreak: { from: number; to: number },
	earnedAt: number
): Promise<void> {
	for (
		let rung = nextStreakRungAfter(longestStreak.from);
		rung <= longestStreak.to;
		rung = nextStreakRungAfter(rung)
	) {
		await awardAchievement(ctx, emotionalProfileId, `streak-${rung}`, earnedAt);
	}
}
