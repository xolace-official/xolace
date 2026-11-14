import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import { telegramInboundPool } from "../pools";
import { strippedPayload } from "./webhook";

/**
 * How long an inbound update is kept (#773). Its text is stripped when it's
 * handled (`inbound.claimUpdate`); the row itself goes after 30 days. An
 * update the pool lost sits in `received`: a cron puts it back once, and
 * marks it `failed`, text stripped, if it's still there after that.
 */

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
export const INBOUND_RETENTION_MS = 30 * DAY_MS;
/** Far longer than one update takes, even behind a queue. */
export const STUCK_AFTER_MS = 5 * MINUTE_MS;
const BATCH = 100;

/** Delete rows received over 30 days ago. Daily, a batch at a time. */
export const purgeOldInbound = internalMutation({
	args: {},
	handler: async (ctx) => {
		const expired = await ctx.db
			.query("inbound_events")
			.withIndex("by_received", (q) =>
				q.lte("receivedAt", Date.now() - INBOUND_RETENTION_MS)
			)
			.take(BATCH);
		for (const event of expired) {
			await ctx.db.delete("inbound_events", event._id);
		}
		if (expired.length === BATCH) {
			await ctx.scheduler.runAfter(
				0,
				internal.outreach.telegram.retention.purgeOldInbound,
				{}
			);
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Its pool job hasn't finished: the update is waiting its turn (the pool
 * runs one at a time) or being handled, not lost.
 */
async function stillOnPool(
	ctx: MutationCtx,
	event: Doc<"inbound_events">
): Promise<boolean> {
	if (event.workId === undefined) {
		return false;
	}
	const { state } = await telegramInboundPool.status(ctx, event.workId);
	return state !== "finished";
}

/**
 * Put each update stuck in `received` for 5 minutes back on the pool, once.
 * One whose job is still queued or running is only slow, and left alone.
 * Handling is idempotent (the claim only takes a `received` row), so one
 * that was merely slow is handled once either way.
 */
export const requeueStuck = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const stuck = await ctx.db
			.query("inbound_events")
			.withIndex("by_status_received", (q) =>
				q.eq("status", "received").lte("receivedAt", now - STUCK_AFTER_MS)
			)
			.take(BATCH);
		for (const event of stuck) {
			if (await stillOnPool(ctx, event)) {
				continue;
			}
			if (event.requeuedAt === undefined) {
				const workId = await telegramInboundPool.enqueueAction(
					ctx,
					internal.outreach.telegram.inbound.processUpdate,
					{ eventId: event._id }
				);
				await ctx.db.patch("inbound_events", event._id, {
					requeuedAt: now,
					workId,
				});
			} else if (event.requeuedAt <= now - STUCK_AFTER_MS) {
				await ctx.db.patch("inbound_events", event._id, {
					linkTokenHash: undefined,
					payload: strippedPayload(Number(event.providerEventId)),
					status: "failed",
				});
			}
		}
		return null;
	},
	returns: v.null(),
});
