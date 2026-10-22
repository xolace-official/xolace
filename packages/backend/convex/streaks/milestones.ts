/**
 * Streak milestone cadence (#435): 7, 30, 100, then every 100 after. The one
 * table both streak-saver earning and milestone notifications (#439) read.
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

/** Template-only push copy for a streak milestone (#439) — no model call. */
export function streakMilestoneCopy(streak: number): string {
  if (streak === 7) return "7 days by the fire. The flame's holding steady.";
  if (streak === 30) return "30 days. This is a rhythm now.";
  if (streak === 100) {
    return "100 days. The fire hasn't gone out once — not because you didn't stumble, but because you came back.";
  }
  return `${streak} days. Still here.`;
}

/**
 * May we push a streak milestone? `streakMilestone` is absent on rows written
 * before it existed; absent follows the session-count `milestone` flag, so
 * users who opted into milestones get these without finding a new toggle.
 * Nothing stamps it alongside `milestone`: an old binary only writes
 * `milestone`, and a stamped copy would outlive its mute.
 */
export function streakMilestoneAllowed(
  notifications: { enabled: boolean; milestone: boolean; streakMilestone?: boolean } | null | undefined,
): boolean {
  if (!notifications?.enabled) return false;
  return notifications.streakMilestone ?? notifications.milestone;
}
