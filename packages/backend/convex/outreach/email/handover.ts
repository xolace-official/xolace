import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { queueEmail } from "./resend";

/**
 * The email adapter's handover to the Resend component (#918 review), in
 * one transaction with the delivery it belongs to: queue the email only
 * while its delivery is still being sent, and store the component's id on
 * the delivery in the same commit. A wipe or account deletion that drains
 * the delivery first leaves nothing queued; one that drains it after always
 * finds the id, and cancels the email before the component sends it.
 *
 * The Clerk lookup and the render stay in the action, outside this.
 * Null when the delivery is gone or no longer being sent.
 */
export const handOver = internalMutation({
	args: {
		deliveryId: v.id("outreach_deliveries"),
		email: v.object({
			from: v.string(),
			html: v.string(),
			replyTo: v.array(v.string()),
			subject: v.string(),
			text: v.string(),
			to: v.string(),
		}),
	},
	handler: async (ctx, { deliveryId, email }) => {
		const delivery = await ctx.db.get("outreach_deliveries", deliveryId);
		if (delivery?.status !== "sending") {
			return null;
		}
		const emailId = await queueEmail(ctx, {
			...email,
			// Keyed by the delivery: a retried handover never queues twice.
			idempotencyKey: deliveryId,
		});
		await ctx.db.patch("outreach_deliveries", deliveryId, {
			providerMessageId: emailId,
		});
		return emailId;
	},
	returns: v.union(v.null(), v.string()),
});
