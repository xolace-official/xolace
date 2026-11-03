import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { awardAchievement } from "./award";
import { nextStreakRungAfter, showingUpRungAt } from "./catalog";

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
