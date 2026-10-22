import type { Doc } from "@/convex/_generated/dataModel";

export type NotificationPrefs = Doc<"preferences">["notifications"];

/**
 * Preference arithmetic behind the two notification toggles.
 *
 * Gentle reminders (the AI reaching out) and chat notifications (a person
 * waiting on you) are independent switches, but they share one OS permission
 * and one push token. So `enabled` is not a third switch the user can see —
 * it is the master, on exactly while at least one family still wants delivery,
 * and it is also what tells the settings screen whether to hold or drop the
 * token.
 *
 * Whether a family *delivers* is therefore a different question from what the
 * user *chose* for it, and the two must not be confused — see `gentleChoice`.
 * For "is chat delivering" use `chatNotificationsAllowed` from
 * `convex/lib/chatNotifications`, the same predicate the server dispatch runs.
 */

/** Is the AI reaching out — the master's word plus this family's own flag. */
export const gentleRemindersOn = (prefs: NotificationPrefs | undefined) =>
  !!prefs?.enabled && prefs.gentleReturn;

/**
 * What the user last chose for a family, ignoring the master.
 *
 * Toggling one family has to carry the other's position along, and the
 * displayed value is the wrong thing to carry: with all notifications off both
 * toggles read off, so feeding that back would write an explicit mute onto a
 * family the user never touched. That is how a fresh user turning on gentle
 * reminders would have silently lost chat — absent `chat` means enabled, and
 * this is where that survives.
 */
export const chatChoice = (prefs: NotificationPrefs | undefined) =>
  prefs?.chat !== false;

export const gentleChoice = (prefs: NotificationPrefs | undefined) =>
  prefs?.gentleReturn ?? false;

/**
 * What the two toggles say, and nothing else.
 *
 * States the toggle fields as a whole because the client is the one that knows
 * both positions; `registerToken` auto-enables everything on a first grant, and
 * this write lands after it to say what the user actually asked for.
 *
 * It deliberately carries no `reach`, `quietWindow`, or `timezone`. The server
 * merges notification writes, so an absent field is a field left alone —
 * whereas echoing one back from `current` re-asserts a value read at the last
 * render, and that snapshot goes stale the moment anything else writes. The
 * timezone `applyToggles` syncs moments earlier was being erased exactly that
 * way. Absent `reach` reads as "warm" on both the settings screen and the
 * dispatch path, so nothing needs it restated here either.
 */
export const nextNotificationPrefs = (next: {
  gentle: boolean;
  chat: boolean;
}): NotificationPrefs => ({
  enabled: next.gentle || next.chat,
  gentleReturn: next.gentle,
  patternNudge: next.gentle,
  milestone: next.gentle,
  chat: next.chat,
});
