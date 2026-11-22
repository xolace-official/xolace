import { vOnEmailEventArgs } from "@convex-dev/resend";
import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import {
	type ClosedEmailStatus,
	closedEmailStatusValidator,
} from "../validators";
import { markEmailState } from "./state";

/**
 * Resend's events, after the webhook's signature check (#916). Only two
 * matter: a hard bounce marks the person `unreachable`, a spam complaint
 * marks them `complained`, and either stops their email. Everything else,
 * opens and clicks included, closes nothing: tracking is off and nothing
 * about reading an email is recorded.
 *
 * Two ways in, both idempotent (`markEmailState`):
 * - `onEmailEvent`, the component's callback, while it still holds its copy
 *   of the email. Finds the delivery by the component's id
 *   (`providerMessageId`) and copies Resend's id onto it from the first
 *   event (`email.sent`, seconds after sending).
 * - `closeByResendId`, from the webhook route itself, for every closing
 *   event. Finds the delivery by Resend's id, so a bounce or complaint that
 *   arrives after the daily cleanup deleted the component's copy (7 or 28
 *   days on) still closes email for that person.
 *
 * An id no delivery has (another sender's email, an account since erased,
 * or a first event the callback hasn't copied yet) is ignored.
 */

/** Resend's bounce type for an address that will never accept mail. */
const HARD_BOUNCE = "Permanent";

/** A verified event that closes email: whose, by Resend's id, and how. */
export type ClosingEvent = {
	resendEmailId: string;
	status: ClosedEmailStatus;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/**
 * The closing event a Resend payload carries, or null for every other event
 * (and anything malformed). Takes the raw webhook body as well as the
 * component's parsed event.
 */
export function closingEvent(payload: unknown): ClosingEvent | null {
	if (!(isRecord(payload) && isRecord(payload.data))) {
		return null;
	}
	const resendEmailId = payload.data.email_id;
	if (typeof resendEmailId !== "string" || resendEmailId === "") {
		return null;
	}
	if (payload.type === "email.complained") {
		return { resendEmailId, status: "complained" };
	}
	const bounce = payload.data.bounce;
	if (
		payload.type === "email.bounced" &&
		isRecord(bounce) &&
		bounce.type === HARD_BOUNCE
	) {
		return { resendEmailId, status: "unreachable" };
	}
	return null;
}

async function closeEmailFor(
	ctx: MutationCtx,
	delivery: Doc<"outreach_deliveries">,
	status: ClosedEmailStatus
): Promise<void> {
	const outreach = await ctx.db.get("outreach", delivery.outreachId);
	if (outreach) {
		await markEmailState(ctx, outreach.emotionalProfileId, status, Date.now());
	}
}

export const onEmailEvent = internalMutation({
	args: vOnEmailEventArgs,
	handler: async (ctx, { event, id }) => {
		const delivery = await ctx.db
			.query("outreach_deliveries")
			.withIndex("by_channel_provider_message", (q) =>
				q.eq("channel", "email").eq("providerMessageId", id)
			)
			.first();
		if (!delivery) {
			return null;
		}
		if (delivery.resendEmailId === undefined && event.data.email_id) {
			await ctx.db.patch("outreach_deliveries", delivery._id, {
				resendEmailId: event.data.email_id,
			});
		}
		const closing = closingEvent(event);
		if (closing) {
			await closeEmailFor(ctx, delivery, closing.status);
		}
		return null;
	},
	returns: v.null(),
});

export const closeByResendId = internalMutation({
	args: {
		resendEmailId: v.string(),
		status: closedEmailStatusValidator,
	},
	handler: async (ctx, { resendEmailId, status }) => {
		const delivery = await ctx.db
			.query("outreach_deliveries")
			.withIndex("by_channel_resend_email", (q) =>
				q.eq("channel", "email").eq("resendEmailId", resendEmailId)
			)
			.first();
		if (delivery) {
			await closeEmailFor(ctx, delivery, status);
		}
		return null;
	},
	returns: v.null(),
});
