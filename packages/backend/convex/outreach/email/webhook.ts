import { httpAction } from "../../_generated/server";
import { resendClient } from "./resend";

/** Where each deployment's Resend webhook points (docs/setup/email.md). */
export const RESEND_WEBHOOK_PATH = "/webhooks/resend";

/**
 * Resend's delivery events (#916). The component checks the Svix signature
 * against `RESEND_WEBHOOK_SECRET`, updates its own copy of the email and
 * hands the event to `events.onEmailEvent`, which acts on hard bounces and
 * spam complaints only.
 */
export const resendWebhook = httpAction(
	async (ctx, req) => await resendClient().handleResendEventWebhook(ctx, req)
);
