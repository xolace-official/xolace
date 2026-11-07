import type { Doc } from "../_generated/dataModel";
import { isInQuietWindow } from "../jobs/notificationTriggers";

/**
 * Missed-beat pushes (#523, #700): an in-app moment that went unseen gets one
 * push the next day, in the person's usual hour, deferred through their quiet
 * window. Shared by domain unlocks and badges.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Re-check this often while the quiet window holds. */
export const QUIET_RETRY_MS = HOUR;
/** Hourly re-checks while the quiet window holds; past a day, let it go. */
export const QUIET_RETRIES = 24;

/**
 * Next day, in their usual hour: the occurrence of `hourUtc` nearest this time
 * tomorrow (12–36h out). `typicalUsagePattern.hourOfDay` is a server (UTC)
 * hour. No pattern yet → this time tomorrow.
 */
export function missedPushAt(at: number, hourUtc?: number): number {
	const tomorrow = at + DAY;
	if (hourUtc === undefined) {
		return tomorrow;
	}
	const t = new Date(tomorrow).setUTCHours(hourUtc, 0, 0, 0);
	return t - tomorrow > 12 * HOUR
		? t - DAY
		: tomorrow - t > 12 * HOUR
			? t + DAY
			: t;
}

/** Is it inside the person's quiet window right now? */
export function inQuietWindow(
	notifications: Doc<"preferences">["notifications"]
): boolean {
	return Boolean(
		notifications.quietWindow &&
			notifications.timezone &&
			isInQuietWindow(
				notifications.timezone,
				notifications.quietWindow.dontReachBefore,
				notifications.quietWindow.dontReachAfter
			)
	);
}
