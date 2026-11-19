import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { localTime, onLocalHour } from "../outreach/quietWindow";
import type { DailyQuoteSetting, DailyQuoteSlot } from "./validators";

/**
 * When the daily quote push is due (B19), and the `daily_quote_pushes` row
 * that holds it. The setting on `preferences.notifications.dailyQuote` is the
 * truth; `syncDailyQuoteSchedule` keeps the row in step with it.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The local hour each slot starts on: the old on-device reminders' times. */
export const SLOT_HOURS: Record<DailyQuoteSlot, number> = {
	afternoon: 13,
	evening: 19,
	morning: 8,
};

/** How often the sweep runs. A slot is picked up at most this late. */
export const SWEEP_EVERY_MINUTES = 15;
export const SWEEP_EVERY_MS = SWEEP_EVERY_MINUTES * MINUTE;

/** A slot more than this far gone (an outage, a clock change) is skipped. */
export const LATE_LIMIT_MS = 2 * HOUR;

/** No zone, or one the runtime doesn't know: UTC, as the quote's date is. */
const FALLBACK_ZONE = "UTC";

function zoneOf(timezone: string | undefined): string {
	return timezone && localTime(timezone, 0) !== null ? timezone : FALLBACK_ZONE;
}

/** The first start of `slot`'s local hour strictly after `after`. */
export function nextSlotAt(
	timezone: string | undefined,
	slot: DailyQuoteSlot,
	after: number
): number {
	const zone = zoneOf(timezone);
	const hour = SLOT_HOURS[slot];
	let from = after;
	// A clock change can land a guess on or before `from`: step past it.
	for (let i = 0; i < 2; i++) {
		const local = localTime(zone, from);
		if (!local) {
			break;
		}
		const startOfHour = from - (from % MINUTE) - local.minute * MINUTE;
		const hoursToGo = (hour - local.hour + 24) % 24 || 24;
		const at = onLocalHour(zone, startOfHour + hoursToGo * HOUR, hour);
		if (at > after) {
			return at;
		}
		from += HOUR;
	}
	return after + 24 * HOUR;
}

/** The profile's schedule row, if the push is on. */
export async function scheduleRowOf(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<Doc<"daily_quote_pushes"> | null> {
	return await ctx.db
		.query("daily_quote_pushes")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
}

/**
 * Bring the schedule row in step with the setting: none while it's off; while
 * it's on, due at the next slot (one starting within the last sweep still
 * counts, so turning it on or a zone change never skips a slot in flight).
 * Turning it on afresh starts the backoff over; a new time or zone keeps it.
 */
export async function syncDailyQuoteSchedule(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	notifications: { dailyQuote?: DailyQuoteSetting; timezone?: string }
): Promise<void> {
	const row = await scheduleRowOf(ctx, emotionalProfileId);
	const setting = notifications.dailyQuote;
	if (!setting?.enabled) {
		if (row) {
			await ctx.db.delete("daily_quote_pushes", row._id);
		}
		return;
	}
	const dueAt = nextSlotAt(
		notifications.timezone,
		setting.slot,
		Date.now() - SWEEP_EVERY_MS
	);
	if (row) {
		await ctx.db.patch("daily_quote_pushes", row._id, { dueAt });
		return;
	}
	await ctx.db.insert("daily_quote_pushes", {
		dueAt,
		emotionalProfileId,
		ignored: 0,
	});
}

/** Opening a quote starts the backoff over. */
export async function resetDailyQuoteBackoff(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<void> {
	const row = await scheduleRowOf(ctx, emotionalProfileId);
	if (row && row.ignored !== 0) {
		await ctx.db.patch("daily_quote_pushes", row._id, { ignored: 0 });
	}
}

/**
 * A data wipe deletes the quotes the row points at, and what the person
 * opened goes with them: the row keeps only the setting's schedule.
 */
export async function forgetDailyQuotePushHistory(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<void> {
	const row = await scheduleRowOf(ctx, emotionalProfileId);
	if (row) {
		await ctx.db.patch("daily_quote_pushes", row._id, {
			ignored: 0,
			lastOutreachId: undefined,
			lastQuoteId: undefined,
			lastSentAt: undefined,
		});
	}
}

/** Account deletion: the row goes with the account. */
export async function deleteDailyQuotePush(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<void> {
	const row = await scheduleRowOf(ctx, emotionalProfileId);
	if (row) {
		await ctx.db.delete("daily_quote_pushes", row._id);
	}
}
