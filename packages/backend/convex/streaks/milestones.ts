import { type Infer, v } from "convex/values";
import {
	isStreakMilestone,
	STREAK_MILESTONE_EVERY,
	STREAK_MILESTONES,
} from "../lib/shared";

export { isStreakMilestone, STREAK_MILESTONE_EVERY, STREAK_MILESTONES };

/**
 * Template-only copy for a streak milestone (#439) — no model call. The streak
 * badges at those rungs carry it, so their push does too (#700).
 */
export function streakMilestoneCopy(streak: number): string {
	if (streak === 7) {
		return "7 days by the fire. The flame's holding steady.";
	}
	if (streak === 30) {
		return "30 days. This is a rhythm now.";
	}
	if (streak === 100) {
		return "100 days. The fire hasn't gone out once — not because you didn't stumble, but because you came back.";
	}
	return `${streak} days. Still here.`;
}

/**
 * What a streak milestone's badge row remembers of the day it was reached
 * (B14), so the arrival can say it truthfully however late it plays:
 * - `added`: what the day put in hand. A milestone adds a saver (SAVER_CAP);
 *   seven qualifying days in a row add a freeze (FREEZE_CAP). A saver is
 *   named first when both landed; "nothing" when both were at their cap.
 * - `dayKey`: the person's local day it was reached ("YYYY-MM-DD").
 * - `week`: the seven local days ending on `dayKey`, oldest first; true for a
 *   day showed up, false for one a freeze or a revive kept.
 */
export const milestoneDetailValidator = v.object({
	added: v.union(v.literal("saver"), v.literal("freeze"), v.literal("nothing")),
	dayKey: v.string(),
	week: v.array(v.boolean()),
});

export type MilestoneDetail = Infer<typeof milestoneDetailValidator>;
