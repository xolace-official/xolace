const LEGACY_REMINDER_PREFIX = "daily-quote-";

export const legacyReminderIds = (
	scheduled: readonly { identifier: string }[]
): string[] =>
	scheduled
		.map((n) => n.identifier)
		.filter((id) => id.startsWith(LEGACY_REMINDER_PREFIX));
