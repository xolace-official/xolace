import type { Doc } from "@xolace/backend/convex/_generated/dataModel";

export type NotificationPrefs = Doc<"preferences">["notifications"];

/** Gentle reminders and chat notifications share one OS permission and one push
 * token; `enabled` is the master, on while at least one family wants delivery. */

/** Whether the AI reaches out: the master flag plus this family's own flag. */
export const gentleRemindersOn = (prefs: NotificationPrefs | undefined) =>
	!!prefs?.enabled && prefs.gentleReturn;

/** What the user last chose for a family, ignoring the master. Absent `chat`
 * means enabled; never feed a displayed (master-masked) value back here. */
export const chatChoice = (prefs: NotificationPrefs | undefined) =>
	prefs?.chat !== false;

export const gentleChoice = (prefs: NotificationPrefs | undefined) =>
	prefs?.gentleReturn ?? false;

/** The toggle fields only. Carries no `reach`, `quietWindow` or `timezone`: the
 * server merges writes, and echoing a stale snapshot would erase newer values. */
export const nextNotificationPrefs = (next: {
	gentle: boolean;
	chat: boolean;
}): NotificationPrefs => ({
	chat: next.chat,
	enabled: next.gentle || next.chat,
	gentleReturn: next.gentle,
	milestone: next.gentle,
	patternNudge: next.gentle,
});
