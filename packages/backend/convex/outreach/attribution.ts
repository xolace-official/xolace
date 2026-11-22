import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Session attribution (#764): a session started within a day of an outreach
 * landing counts as that outreach's result, tap or no tap. Read from the
 * layer, so it covers every channel; the push's `notification_log` row is
 * marked too, for shipped builds reading it.
 */

const ATTRIBUTION_WINDOW_MS = 24 * 60 * 60 * 1000;
/**
 * Outreach created this far back can still have landed inside the window: a
 * quiet-window deferral holds it under a day.
 */
const ATTRIBUTION_LOOKBACK_MS = 2 * ATTRIBUTION_WINDOW_MS;
/** Recent outreach looked at; a day's buckets allow only a handful. */
const ATTRIBUTION_SCAN = 20;
/** An outreach has one delivery, plus at most one fallback. */
const MAX_DELIVERIES_PER_OUTREACH = 10;

/**
 * Mark the latest outreach delivered in the last day as having resulted in
 * a session, unless something already claimed it.
 */
export async function attributeSession(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	now: number
): Promise<void> {
	const recent = await ctx.db
		.query("outreach")
		.withIndex("by_profile_created", (q) =>
			q
				.eq("emotionalProfileId", emotionalProfileId)
				.gte("createdAt", now - ATTRIBUTION_LOOKBACK_MS)
		)
		.order("desc")
		.take(ATTRIBUTION_SCAN);

	let latest: {
		deliveries: Doc<"outreach_deliveries">[];
		outreach: Doc<"outreach">;
		sentAt: number;
	} | null = null;
	for (const outreach of recent) {
		if (outreach.outcome !== "queued") {
			continue;
		}
		const deliveries = await ctx.db
			.query("outreach_deliveries")
			.withIndex("by_outreach", (q) => q.eq("outreachId", outreach._id))
			.take(MAX_DELIVERIES_PER_OUTREACH);
		for (const { sentAt, status } of deliveries) {
			if (
				status === "sent" &&
				sentAt !== undefined &&
				sentAt >= now - ATTRIBUTION_WINDOW_MS &&
				(latest === null || sentAt > latest.sentAt)
			) {
				latest = { deliveries, outreach, sentAt };
			}
		}
	}
	if (!latest || latest.outreach.resultedInSession !== undefined) {
		return;
	}
	await ctx.db.patch("outreach", latest.outreach._id, {
		resultedInSession: true,
	});
	for (const { notificationLogId } of latest.deliveries) {
		if (notificationLogId) {
			await ctx.db.patch("notification_log", notificationLogId, {
				resultedInSession: true,
			});
		}
	}
}
