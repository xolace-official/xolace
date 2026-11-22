import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { updateNotificationPrefs } from "../lib/notificationPrefs";
import { type DailyQuoteSlot, dailyQuoteSettingValidator } from "./validators";

/** The old on-device reminder's times that are a daily quote slot. */
const LEGACY_SLOTS: ReadonlySet<string> = new Set<DailyQuoteSlot>([
	"morning",
	"afternoon",
	"evening",
]);

const isSlot = (time: string | undefined): time is DailyQuoteSlot =>
	time !== undefined && LEGACY_SLOTS.has(time);

/**
 * The app has cancelled the old on-device daily quote reminders
 * (`daily-quote-*`); carry their setting over to the daily quote push, so
 * nobody has to opt in again (B19).
 *
 * The migration, done lazily by the app rather than on deploy: a build that
 * still schedules its own reminders never calls this, so nobody gets the
 * quote twice through the store gap. Anyone who had them on at a time
 * (`quotes.notificationEnabled` and a morning, afternoon or evening
 * `notificationTime`) gets the push on at the same slot. Does nothing once
 * `notifications.dailyQuote` is set, whoever set it: safe to call on every
 * launch.
 *
 * Returns the setting as it now stands (null = never chosen).
 */
export const adoptLegacyReminders = mutation({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();
		if (!prefs) {
			return null;
		}
		const current = prefs.notifications.dailyQuote;
		if (current !== undefined) {
			return current;
		}
		const legacy = prefs.quotes;
		if (!(legacy?.notificationEnabled && isSlot(legacy.notificationTime))) {
			return null;
		}
		const adopted = { enabled: true, slot: legacy.notificationTime };
		await updateNotificationPrefs(ctx, profile._id, { dailyQuote: adopted });
		return adopted;
	},
	returns: v.union(dailyQuoteSettingValidator, v.null()),
});
