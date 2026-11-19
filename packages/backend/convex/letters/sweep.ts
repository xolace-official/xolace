/**
 * The hourly sweep (spec §5.3): pool rows due a refresh, waiting letters in
 * the order they passed (FIFO, #749), letters waiting too long, unchecked
 * letters due a re-check, and the invite flag. Each step works in bounded
 * pages and schedules its own next page.
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { captureLetterEvent } from "./analytics";
import { placeLetter } from "./match";
import { refreshPool } from "./pool";
import {
	DAY_MS,
	INVITE_BACKLOG_DAYS,
	INVITE_COUNT_MAX,
	LETTER_WAIT_DAYS,
	RECHECK_DELAYS_MS,
	SWEEP_BATCH,
} from "./rules";

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		await ctx.scheduler.runAfter(0, internal.letters.sweep.refreshDue, {});
		await ctx.scheduler.runAfter(0, internal.letters.sweep.placeWaiting, {});
		await ctx.scheduler.runAfter(0, internal.letters.sweep.uncheckedDue, {});
		await ctx.scheduler.runAfter(0, internal.letters.sweep.invite, {});
		return null;
	},
	returns: v.null(),
});

/** Pool rows whose `poolCheckAt` passed. A refresh always moves it on. */
export const refreshDue = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const due = await ctx.db
			.query("letter_profiles")
			.withIndex("by_pool_check", (q) =>
				q.gte("poolCheckAt", 0).lte("poolCheckAt", now)
			)
			.take(SWEEP_BATCH);
		for (const row of due) {
			await refreshPool(ctx, row.emotionalProfileId, now);
		}
		if (due.length === SWEEP_BATCH) {
			await ctx.scheduler.runAfter(0, internal.letters.sweep.refreshDue, {});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Waiting letters, oldest pass first: return those past the wait, place the
 * rest. A language whose pool came back empty is skipped for the rest of the
 * sweep.
 */
export const placeWaiting = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		emptyLanguages: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const empty = new Set(args.emptyLanguages);
		const page = await ctx.db
			.query("letters")
			.withIndex("by_status_checked", (q) => q.eq("status", "waiting"))
			.paginate({ cursor: args.cursor ?? null, numItems: SWEEP_BATCH });
		for (const letter of page.page) {
			if ((letter.checkedAt ?? 0) + LETTER_WAIT_DAYS * DAY_MS <= now) {
				// "Not placed. No one it fit came along this time." (decision C)
				await ctx.db.patch("letters", letter._id, { status: "returned" });
				if (letter.senderProfileId) {
					await captureLetterEvent(ctx, letter.senderProfileId, {
						event: "letter_returned",
						properties: { why: "unplaced" },
					});
				}
				continue;
			}
			if (empty.has(letter.language)) {
				continue;
			}
			const result = await placeLetter(ctx, letter._id, now);
			if (typeof result === "object" && result.poolEmpty) {
				empty.add(letter.language);
			}
		}
		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.letters.sweep.placeWaiting, {
				cursor: page.continueCursor,
				emptyLanguages: [...empty],
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Unchecked letters: returned past the wait, otherwise re-checked once their
 * scheduled re-checks are spent.
 */
export const uncheckedDue = internalMutation({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const now = Date.now();
		const page = await ctx.db
			.query("letters")
			.withIndex("by_status_checked", (q) => q.eq("status", "unchecked"))
			.paginate({ cursor: args.cursor ?? null, numItems: SWEEP_BATCH });
		for (const letter of page.page) {
			if (letter.createdAt + LETTER_WAIT_DAYS * DAY_MS <= now) {
				await ctx.db.patch("letters", letter._id, { status: "returned" });
				if (letter.senderProfileId) {
					await captureLetterEvent(ctx, letter.senderProfileId, {
						event: "letter_returned",
						properties: { why: "unchecked" },
					});
				}
			} else if ((letter.recheckCount ?? 0) >= RECHECK_DELAYS_MS.length) {
				await ctx.scheduler.runAfter(0, internal.letters.check.recheck, {
					letterId: letter._id,
				});
			}
		}
		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.letters.sweep.uncheckedDue, {
				cursor: page.continueCursor,
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Whether the session-end write card may invite a letter: not while more
 * letters wait than `INVITE_BACKLOG_DAYS` of recent placements (§9). Kept on
 * one row so `status.get` reads a single document.
 */
export const invite = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const placed = await ctx.db
			.query("letters")
			.withIndex("by_received", (q) =>
				q.gt("receivedAt", now - INVITE_BACKLOG_DAYS * DAY_MS)
			)
			.take(INVITE_COUNT_MAX);
		const waiting = await ctx.db
			.query("letters")
			.withIndex("by_status_checked", (q) => q.eq("status", "waiting"))
			.take(placed.length + 1);
		const stats = {
			invite: waiting.length <= placed.length,
			updatedAt: now,
		};
		const existing = await ctx.db.query("letter_stats").first();
		await (existing
			? ctx.db.patch("letter_stats", existing._id, stats)
			: ctx.db.insert("letter_stats", stats));
		return null;
	},
	returns: v.null(),
});
