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
