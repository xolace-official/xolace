import { vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import type { ClosedEmailStatus } from "../validators";
import { markEmailState } from "./state";

/**
 * Resend's events, as the component hands them on after its verified webhook
 * (#916). Only two matter: a hard bounce marks the person `unreachable`, a
 * spam complaint marks them `complained`, and either stops their email.
 * Everything else, opens and clicks included, is dropped: tracking is off
 * and nothing about reading an email is recorded.
 *
 * The component's email id is the delivery's `providerMessageId`; an id no
 * delivery has (another sender's email, or an account since erased) is
 * ignored.
 */

/** Resend's bounce type for an address that will never accept mail. */
const HARD_BOUNCE = "Permanent";

export const onEmailEvent = internalMutation({
	args: vOnEmailEventArgs,
	handler: async (ctx, { event, id }) => {
		let status: ClosedEmailStatus;
		if (event.type === "email.complained") {
			status = "complained";
		} else if (
			event.type === "email.bounced" &&
			event.data.bounce.type === HARD_BOUNCE
		) {
			status = "unreachable";
		} else {
			return null;
		}

		const delivery = await ctx.db
			.query("outreach_deliveries")
			.withIndex("by_channel_provider_message", (q) =>
				q.eq("channel", "email").eq("providerMessageId", id)
			)
			.first();
		const outreach =
			delivery && (await ctx.db.get("outreach", delivery.outreachId));
		if (!outreach) {
			return null;
		}
		await markEmailState(ctx, outreach.emotionalProfileId, status, Date.now());
		return null;
	},
	returns: v.null(),
});
