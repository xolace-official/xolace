import { type Infer, v } from "convex/values";

/**
 * The daily quote push's literals (B19). Their own module, with no imports
 * beyond `convex/values`, so the schema can take them without a cycle.
 */

/** When in the person's day the daily quote comes: 08:00, 13:00 or 19:00 local. */
export const dailyQuoteSlotValidator = v.union(
	v.literal("morning"),
	v.literal("afternoon"),
	v.literal("evening")
);
export type DailyQuoteSlot = Infer<typeof dailyQuoteSlotValidator>;

/**
 * `preferences.notifications.dailyQuote`. Absent = never chosen (off; the app
 * may offer it once). `pausedAt`: the backoff turned it off after the quote
 * kept going unopened; turning it back on clears it.
 */
export const dailyQuoteSettingValidator = v.object({
	enabled: v.boolean(),
	pausedAt: v.optional(v.number()),
	slot: dailyQuoteSlotValidator,
});
export type DailyQuoteSetting = Infer<typeof dailyQuoteSettingValidator>;

/** What the app sets: on or off, and when. Setting it clears a pause. */
export const dailyQuoteChoiceValidator = v.object({
	enabled: v.boolean(),
	slot: dailyQuoteSlotValidator,
});
