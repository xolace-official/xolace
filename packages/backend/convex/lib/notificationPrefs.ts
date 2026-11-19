import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { syncDailyQuoteSchedule } from "../dailyQuotes/schedule";

type NotificationPrefs = Doc<"preferences">["notifications"];

/**
 * Read-merge-write for the nested `preferences.notifications` object.
 *
 * All writes to notification preferences must go through this helper to
 * avoid a `ctx.db.patch` that accidentally replaces the whole sub-object
 * with a partial — preserving every field the caller didn't touch.
 *
 * It also keeps the daily quote push's schedule (`daily_quote_pushes`) in
 * step when the setting or the time zone changes (B19).
 */
export async function updateNotificationPrefs(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	partial: Partial<NotificationPrefs>
): Promise<void> {
	const preferences = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();

	if (!preferences) {
		return;
	}

	const notifications = withPushOn(
		{ ...preferences.notifications, ...partial },
		partial
	);
	await ctx.db.patch("preferences", preferences._id, { notifications });

	const movedZone =
		"timezone" in partial &&
		partial.timezone !== preferences.notifications.timezone;
	if ("dailyQuote" in partial || movedZone) {
		await syncDailyQuoteSchedule(ctx, emotionalProfileId, notifications);
	}
}

/**
 * Turning the daily quote on turns push on with it: `enabled` is push's
 * switch for every intent (#760), and the app's master means "at least one
 * kind of notification wants delivery". Someone who had only the old
 * on-device quote reminders has it off, so without this the push they chose
 * would never reach them. `chat` is pinned off when it was never chosen
 * (absent means on), so the master coming on wakes nothing they didn't pick.
 */
function withPushOn(
	notifications: NotificationPrefs,
	partial: Partial<NotificationPrefs>
): NotificationPrefs {
	if (!(partial.dailyQuote?.enabled && !notifications.enabled)) {
		return notifications;
	}
	return {
		...notifications,
		chat: notifications.chat ?? false,
		enabled: true,
	};
}
