import { internal } from "../../_generated/api";
import { httpAction } from "../../_generated/server";
import { closingEvent } from "./events";
import { resendClient } from "./resend";

/** Where each deployment's Resend webhook points (docs/setup/email.md). */
export const RESEND_WEBHOOK_PATH = "/webhooks/resend";

/**
 * Resend's delivery events (#916). The component checks the Svix signature
 * against `RESEND_WEBHOOK_SECRET` and throws on a bad one, so nothing after
 * it runs for an unverified body. It updates its own copy of the email and
 * hands the event to `events.onEmailEvent`, but only while it still holds
 * that copy. So a hard bounce or spam complaint is also handled here, by
 * Resend's id: one that arrives after the daily cleanup still closes email
 * for that person (`events.closeByResendId`).
 */
export const resendWebhook = httpAction(async (ctx, req) => {
	// Read once: the component gets the same bytes, which it verifies.
	const raw = await req.text();
	const response = await resendClient().handleResendEventWebhook(
		ctx,
		new Request(req.url, { body: raw, headers: req.headers, method: "POST" })
	);
	const closing = closingEvent(JSON.parse(raw));
	if (closing) {
		await ctx.runMutation(
			internal.outreach.email.events.closeByResendId,
			closing
		);
	}
	return response;
});
