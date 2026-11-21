/**
 * The hourly sweep (spec §5.3): four steps started side by side, so one
 * failing never starves the others. Pool rows due a refresh; waiting letters
 * in the order they passed (FIFO, #749) with those waiting too long returned,
 * started {@link PLACE_AFTER_MS} later so the refresh has usually run;
 * unchecked letters due a re-check; and the invite flag. Each step works in
 * bounded pages and schedules its own next page. Two sweeps overlapping only
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
	PLACE_AFTER_MS,
	RECHECK_DELAYS_MS,
	RECHECK_OVERDUE_MS,
	RECHECK_SWEEP_MAX,
	SWEEP_BATCH,
} from "./rules";

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		await ctx.scheduler.runAfter(0, internal.letters.sweep.refreshDue, {});
		await ctx.scheduler.runAfter(
			PLACE_AFTER_MS,
			internal.letters.sweep.placeWaiting,
			{}
		);
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

/** Where `placeWaiting` stopped: the last letter it handled, in index order. */
const placeCursorValidator = v.object({
	checkedAt: v.number(),
	creationTime: v.number(),
});

/**
 * Waiting letters, oldest pass first: return those past the wait, place the
 * rest. Returns and skips are cheap and run `SWEEP_BATCH` to a mutation; a
 * placement reads the pool, so each runs in a mutation of its own and the
 * next one is scheduled after it. Once a letter finds no one because of the
 * pool, the rest of this sweep skips its language (or, inside an aim window,
 * its language and aim): the next letter would read the same pool. When only
 * its sender stood in the way (their own row, a block) or the walk stopped
 * early, only that sender's letters there are skipped.
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
			} else if (!skippedBy(skip, letter)) {
				const result = await placeLetter(ctx, letter._id, now);
				if (typeof result === "object") {
					const pool = result.aimOnly ? aimKey(letter) : letter.language;
					skip.add(result.anyone ? pool : senderKey(pool, letter));
				}
				if (result === "placed" || typeof result === "object") {
					break;
				}
			}
			if (handled >= SWEEP_BATCH) {
				break;
			}
		}
		if (last) {
			await ctx.scheduler.runAfter(0, internal.letters.sweep.placeWaiting, {
				after: last,
				skip: [...skip],
			});
		}
		return null;
	},
	returns: v.null(),
});

/** The skip key for a letter's own aim inside its window. */
const aimKey = (letter: Doc<"letters">) =>
	`${letter.language}:${letter.aim ?? ""}`;

/** A pool's skip key narrowed to one sender's letters. */
const senderKey = (pool: string, letter: Doc<"letters">) =>
	`${pool}#${letter.senderProfileId ?? ""}`;

/** Whether this sweep already found no one for a letter like this one. */
function skippedBy(skip: Set<string>, letter: Doc<"letters">): boolean {
	return [letter.language, aimKey(letter)].some(
		(pool) => skip.has(pool) || skip.has(senderKey(pool, letter))
	);
}

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
		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.letters.sweep.uncheckedDue, {
				cursor: page.continueCursor,
				started,
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Whether the session-end write card may invite a letter: not while more
 * letters wait than `INVITE_BACKLOG_DAYS` of recent placements (§9). Kept on
 * one row so `status.get` reads a single document, written only when the flag
 * changes so subscribed clients don't re-run every hour (`updatedAt` is when
 * it last changed).
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
		const invite = waiting.length <= placed.length;
		const existing = await ctx.db.query("letter_stats").first();
		if (!existing) {
			await ctx.db.insert("letter_stats", { invite, updatedAt: now });
		} else if (existing.invite !== invite) {
			await ctx.db.patch("letter_stats", existing._id, {
				invite,
				updatedAt: now,
			});
		}
		return null;
	},
	returns: v.null(),
});
