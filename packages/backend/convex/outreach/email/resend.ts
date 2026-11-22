import { Resend } from "@convex-dev/resend";
import { components, internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { emailTestMode } from "./config";

/**
 * The one way into the Resend component (#914). The component batches the
 * email to Resend and retries Resend's own 429s and 5xx; open and click
 * tracking are switched off on the sending domain (docs/setup/email.md), as
 * Resend has no per-email switch.
 */

export type OutgoingEmail = {
	from: string;
	html: string;
	/** The delivery id: a retried handover never queues a second email. */
	idempotencyKey: string;
	replyTo: string[];
	subject: string;
	text: string;
	to: string;
};

/**
 * Built per call: the env (test mode, `RESEND_WEBHOOK_SECRET`) is read when
 * it's used, not at import. Every client names the event callback: the
 * component keeps the one from the latest send (#916).
 */
export function resendClient(): Resend {
	return new Resend(components.resend, {
		onEmailEvent: internal.outreach.email.events.onEmailEvent,
		testMode: emailTestMode(),
	});
}

/** Hand an email to the component; its id there, for webhook events (#916). */
export async function queueEmail(
	ctx: ActionCtx,
	email: OutgoingEmail
): Promise<string> {
	return await resendClient().sendEmail(ctx, email);
}
