/**
 * When a notification was last tapped, so a screen deciding what greets an open (the rating
 * screen) can tell an open through a push from a plain one. Module state: one app, one clock.
 */
let lastTapAt = Number.NEGATIVE_INFINITY;

/** Called by the tap handler (`use-notifications.ts`) for every tap, cold start included. */
export const markNotificationTap = (at = Date.now()) => {
	lastTapAt = at;
};

/** Whether a notification was tapped at or after `since` (epoch ms). */
export const tappedSince = (since: number) => lastTapAt >= since;
