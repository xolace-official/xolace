/**
 * Streak milestone cadence (#435): 7, 30, 100, then every 100 after. Drives
 * streak-saver earning only; badge pushes replaced the milestone push (#700).
 */
export const STREAK_MILESTONES = [7, 30, 100] as const;
/** Past the last fixed milestone, one lands every this many days. */
export const STREAK_MILESTONE_EVERY = 100;

export function isStreakMilestone(streak: number): boolean {
	const last = STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
	return (
		(STREAK_MILESTONES as readonly number[]).includes(streak) ||
		(streak > last && streak % STREAK_MILESTONE_EVERY === 0)
	);
}

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
