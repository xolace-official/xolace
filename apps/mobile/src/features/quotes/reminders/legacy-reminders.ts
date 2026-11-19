/**
 * The old on-device daily quote reminders (`expo-notifications` WEEKLY triggers, scheduled by
 * builds before B19 as `daily-quote-<time>-<weekday>`). The server sends the daily quote now, so
 * every launch cancels whatever of them is still scheduled on this device. Pure.
 */
const LEGACY_REMINDER_PREFIX = "daily-quote-";

/** Which scheduled notifications are old daily quote reminders. */
export const legacyReminderIds = (
	scheduled: readonly { identifier: string }[]
): string[] =>
	scheduled
		.map((n) => n.identifier)
		.filter((id) => id.startsWith(LEGACY_REMINDER_PREFIX));
