/**
 * The hourly sweep (spec §5.3), one step after another: pool rows due a
 * refresh, then waiting letters in the order they passed (FIFO, #749) with
 * those waiting too long returned, then unchecked letters due a re-check, then
 * the invite flag. Each step works in bounded pages, schedules its own next
 * page, and starts the next step when it's done. Two sweeps overlapping only
 * repeat work: every write re-reads the row it changes.
 */
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { captureLetterEvent } from "./analytics";
import { placeLetter } from "./match";
import { refreshPool } from "./pool";
import {
	DAY_MS,
	INVITE_BACKLOG_DAYS,
	INVITE_COUNT_MAX,
	LETTER_WAIT_DAYS,
	RECHECK_DELAYS_MS,
	RECHECK_OVERDUE_MS,
	RECHECK_SWEEP_MAX,
	SWEEP_BATCH,
} from "./rules";

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		await ctx.scheduler.runAfter(0, internal.letters.sweep.refreshDue, {});
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
		await (due.length === SWEEP_BATCH
			? ctx.scheduler.runAfter(0, internal.letters.sweep.refreshDue, {})
			: ctx.scheduler.runAfter(0, internal.letters.sweep.placeWaiting, {}));
		return null;
	},
	returns: v.null(),
});

/** Where `placeWaiting` stopped: the last letter it handled, in index order. */
const placeCursorValidator = v.object({
	checkedAt: v.number(),
	creationTime: v.number(),
});

/**
 * Waiting letters, oldest pass first: return those past the wait, place the
 * rest. Returns and skips are cheap and run `SWEEP_BATCH` to a mutation; a
 * placement reads the pool, so each runs in a mutation of its own and the
 * next one is scheduled after it. Once a letter finds no one, the rest of
 * this sweep skips its language (or, inside an aim window, its language and
 * aim): the next letter would read the same pool.
 */
export const placeWaiting = internalMutation({
	args: {
		after: v.optional(placeCursorValidator),
		skip: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const skip = new Set(args.skip);
		const after = args.after;
		const letters = ctx.db
			.query("letters")
			.withIndex("by_status_checked", (q) =>
				after
					? q.eq("status", "waiting").gte("checkedAt", after.checkedAt)
					: q.eq("status", "waiting")
			);
		let handled = 0;
		let last: typeof after;
		for await (const letter of letters) {
			const checkedAt = letter.checkedAt ?? 0;
			if (
				after &&
				checkedAt === after.checkedAt &&
				letter._creationTime <= after.creationTime
			) {
				continue;
			}
			last = { checkedAt, creationTime: letter._creationTime };
			handled += 1;
			if (checkedAt + LETTER_WAIT_DAYS * DAY_MS <= now) {
				await returnUnplaced(ctx, letter);
			} else if (!(skip.has(letter.language) || skip.has(aimKey(letter)))) {
				const result = await placeLetter(ctx, letter._id, now);
				if (typeof result === "object") {
					skip.add(result.aimOnly ? aimKey(letter) : letter.language);
				}
				if (result === "placed" || typeof result === "object") {
					break;
				}
			}
			if (handled >= SWEEP_BATCH) {
				break;
			}
		}
		await (last
			? ctx.scheduler.runAfter(0, internal.letters.sweep.placeWaiting, {
					after: last,
					skip: [...skip],
				})
			: ctx.scheduler.runAfter(0, internal.letters.sweep.uncheckedDue, {}));
		return null;
	},
	returns: v.null(),
});

/** The skip key for a letter's own aim inside its window. */
const aimKey = (letter: Doc<"letters">) =>
	`${letter.language}:${letter.aim ?? ""}`;

/** "Not placed. No one it fit came along this time." (decision C) */
async function returnUnplaced(
	ctx: MutationCtx,
	letter: Doc<"letters">
): Promise<void> {
	await ctx.db.patch("letters", letter._id, { status: "returned" });
	if (letter.senderProfileId) {
		await captureLetterEvent(ctx, letter.senderProfileId, {
			event: "letter_returned",
			properties: { why: "unplaced" },
		});
	}
}

/**
 * Unchecked letters: returned past the wait, otherwise re-checked once the
 * re-check they're due is overdue (past the scheduled ones, or one that failed
 * before it wrote anything), at most `RECHECK_SWEEP_MAX` a sweep.
 */
export const uncheckedDue = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		started: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		let started = args.started ?? 0;
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
			} else if (
				started < RECHECK_SWEEP_MAX &&
				(letter.recheckDueAt ?? letter.createdAt + RECHECK_DELAYS_MS[0]) +
					RECHECK_OVERDUE_MS <=
					now
			) {
				// Due again from now, so an overlapping sweep doesn't start a
				// second, and the next one retries if this one fails too.
				await ctx.db.patch("letters", letter._id, { recheckDueAt: now });
				await ctx.scheduler.runAfter(0, internal.letters.check.recheck, {
					letterId: letter._id,
				});
				started += 1;
			}
		}
		await (page.isDone
			? ctx.scheduler.runAfter(0, internal.letters.sweep.invite, {})
			: ctx.scheduler.runAfter(0, internal.letters.sweep.uncheckedDue, {
					cursor: page.continueCursor,
					started,
				}));
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
