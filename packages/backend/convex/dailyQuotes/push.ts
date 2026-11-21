import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { updateNotificationPrefs } from "../lib/notificationPrefs";
import { hasPremium } from "../lib/premium";
import { accountDeleted } from "../outreach/router";
import { DAILY_QUOTE_COPY, openingWords } from "./copy";
import { quoteOpened } from "./opened";
import { LATE_LIMIT_MS, nextSlotAt, SWEEP_EVERY_MS } from "./schedule";
import type { DailyQuoteSetting } from "./validators";

/**
 * The daily quote push (B19): today's quote, sent through the outreach layer
 * at the person's chosen local time. Outreach decides whether and where (the
 * crisis hold, the quiet window, the channel); this decides whether it would
 * help at all:
 *
 * - only once today's quote is made (the nightly generator's curated row);
 * - never once it's open (`quoteOpened`), here or when the push goes out;
 * - the backoff. A send is *ignored* when it reached the person (a delivery
 *   `sent`) and they hadn't opened its quote, or tapped the push, by the next
 *   slot, when it's settled. After `EVERY_OTHER_DAY_AFTER` ignored in a row it
 *   goes every other day; after `PAUSE_AFTER` it pauses with one last line.
 *   Opening any quote starts it over. A send that never reached them (held,
 *   no channel) counts neither way.
 */

export const EVERY_OTHER_DAY_AFTER = 5;
export const PAUSE_AFTER = 10;

const HOUR = 3_600_000;
/** Every other day: a slot this soon after the last send is skipped. */
const EVERY_OTHER_DAY_GAP_MS = 36 * HOUR;

/** Rows one sweep takes; a full batch sweeps again straight away. */
const SWEEP_BATCH = 50;

/** The UTC date the quote is made for, as `dailyQuotes.getToday` reads it. */
function quoteDate(at: number): string {
	return new Date(at).toISOString().split("T")[0];
}

/**
 * Today's quote as the app would show it: the personalised one for Xolace+,
 * else the curated one. Null until the generator has finished for the day
 * (curated is its last step).
 */
async function todaysQuote(
	ctx: MutationCtx,
	profile: Doc<"emotional_profiles">,
	date: string
): Promise<{
	opened: boolean;
	shown: Doc<"daily_quotes">;
} | null> {
	const rows = await ctx.db
		.query("daily_quotes")
		.withIndex("by_profile_date", (q) =>
			q.eq("emotionalProfileId", profile._id).eq("date", date)
		)
		.take(2);
	const curated = rows.find((row) => row.type === "curated");
	if (!curated) {
		return null;
	}
	const session = rows.find((row) => row.type === "session");
	const shown = session && (await hasPremium(ctx, profile)) ? session : curated;
	return { opened: rows.some(quoteOpened), shown };
}

/**
 * Settle the last send: opened (or tapped) starts the backoff over, ignored
 * counts one more, and one that never reached the person counts neither way.
 */
async function settle(
	ctx: MutationCtx,
	row: Doc<"daily_quote_pushes">
): Promise<number> {
	if (!row.lastOutreachId) {
		return row.ignored;
	}
	const outreach = await ctx.db.get("outreach", row.lastOutreachId);
	const quote = row.lastQuoteId
		? await ctx.db.get("daily_quotes", row.lastQuoteId)
		: null;
	if (!(outreach && quote)) {
		// Erased meanwhile: nothing left to judge.
		return row.ignored;
	}
	const deliveries = await ctx.db
		.query("outreach_deliveries")
		.withIndex("by_outreach", (q) => q.eq("outreachId", outreach._id))
		.take(10);
	if (!deliveries.some((delivery) => delivery.status === "sent")) {
		return row.ignored;
	}
	return quoteOpened(quote) || outreach.resultedInSession === true
		? 0
		: row.ignored + 1;
}

async function setting(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<{
	dailyQuote: DailyQuoteSetting | undefined;
	timezone: string | undefined;
}> {
	const prefs = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
	return {
		dailyQuote: prefs?.notifications.dailyQuote,
		timezone: prefs?.notifications.timezone,
	};
}

/** What one due row came to; for the sweep's tests and logs. */
export type DailyQuoteDecision =
	| "off"
	| "not_due"
	| "not_made"
	| "opened"
	| "every_other_day"
	| "paused"
	| "sent"
	| "held";

/** Decide one due row, and move it to its next time. */
export async function decide(
	ctx: MutationCtx,
	row: Doc<"daily_quote_pushes">,
	now: number
): Promise<DailyQuoteDecision> {
	const { dailyQuote, timezone } = await setting(ctx, row.emotionalProfileId);
	const profile = await ctx.db.get(
		"emotional_profiles",
		row.emotionalProfileId
	);
	if (
		!(dailyQuote?.enabled && profile) ||
		(await accountDeleted(ctx, row.emotionalProfileId))
	) {
		await ctx.db.delete("daily_quote_pushes", row._id);
		return "off";
	}

	// The slot as the person's zone has it now: a moved zone, or a slot too
	// long gone, waits for the next one.
	const slotAt = nextSlotAt(timezone, dailyQuote.slot, now - LATE_LIMIT_MS);
	if (slotAt > now) {
		await ctx.db.patch("daily_quote_pushes", row._id, { dueAt: slotAt });
		return "not_due";
	}
	const next = nextSlotAt(timezone, dailyQuote.slot, slotAt);

	const ignored = await settle(ctx, row);
	const settled = {
		ignored,
		lastOutreachId: undefined,
		lastQuoteId: undefined,
	};

	if (ignored >= PAUSE_AFTER) {
		await ctx.runMutation(internal.outreach.enqueue.enqueue, {
			content: { ...DAILY_QUOTE_COPY.paused },
			dedupeKey: `daily_quote_paused:${row.emotionalProfileId}:${quoteDate(now)}`,
			emotionalProfileId: row.emotionalProfileId,
			intent: "daily_quote",
			provenance: { triggerReason: "daily_quote_paused" },
		});
		// Deletes the row.
		await updateNotificationPrefs(ctx, row.emotionalProfileId, {
			dailyQuote: { enabled: false, pausedAt: now, slot: dailyQuote.slot },
		});
		return "paused";
	}

	const date = quoteDate(now);
	const today = await todaysQuote(ctx, profile, date);
	if (!today) {
		// Still being made: look again next sweep, while the slot lasts.
		const retryAt = now + SWEEP_EVERY_MS;
		await ctx.db.patch("daily_quote_pushes", row._id, {
			...settled,
			dueAt: retryAt < slotAt + LATE_LIMIT_MS ? retryAt : next,
		});
		return "not_made";
	}
	if (today.opened) {
		await ctx.db.patch("daily_quote_pushes", row._id, {
			...settled,
			dueAt: next,
		});
		return "opened";
	}
	if (
		ignored >= EVERY_OTHER_DAY_AFTER &&
		row.lastSentAt !== undefined &&
		slotAt - row.lastSentAt < EVERY_OTHER_DAY_GAP_MS
	) {
		await ctx.db.patch("daily_quote_pushes", row._id, {
			...settled,
			dueAt: next,
		});
		return "every_other_day";
	}

	const { shown } = today;
	const curated = shown.type === "curated";
	const result = await ctx.runMutation(internal.outreach.enqueue.enqueue, {
		content: {
			body: curated
				? `“${openingWords(shown.text)}”`
				: DAILY_QUOTE_COPY.personal,
			title: DAILY_QUOTE_COPY.title,
		},
		dedupeKey: `daily_quote:${row.emotionalProfileId}:${date}`,
		emotionalProfileId: row.emotionalProfileId,
		intent: "daily_quote",
		moment: { kind: "daily_quote", quoteId: shown._id },
		provenance: { triggerReason: `daily_quote_${dailyQuote.slot}` },
		// Telegram's history outlives the lock screen: a personalised quote's
		// words never go there.
		variants: {
			telegram: curated
				? { body: DAILY_QUOTE_COPY.title, quote: shown.text.trim() }
				: { body: DAILY_QUOTE_COPY.personal },
		},
	});
	const queued = result.outcome === "queued";
	await ctx.db.patch("daily_quote_pushes", row._id, {
		...settled,
		dueAt: next,
		...(queued && {
			lastOutreachId: result.outreachId,
			lastQuoteId: shown._id,
			lastSentAt: now,
		}),
	});
	return queued ? "sent" : "held";
}

/**
 * The sweep: every profile whose slot has come, oldest first. Runs every
 * `SWEEP_EVERY_MINUTES`; a full batch runs again straight away.
 */
export const sweep = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const due = await ctx.db
			.query("daily_quote_pushes")
			.withIndex("by_due", (q) => q.lte("dueAt", now))
			.take(SWEEP_BATCH);
		for (const row of due) {
			await decide(ctx, row, now);
		}
		if (due.length === SWEEP_BATCH) {
			await ctx.scheduler.runAfter(0, internal.dailyQuotes.push.sweep, {});
		}
		return null;
	},
	returns: v.null(),
});
