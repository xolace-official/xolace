import { Resend } from "@convex-dev/resend";
import { components } from "../../_generated/api";
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

/** Hand an email to the component; its id there, for webhook events (#916). */
export async function queueEmail(
	ctx: ActionCtx,
	email: OutgoingEmail
): Promise<string> {
	// Built per call: the env is read when the email goes, not at import.
	const resend = new Resend(components.resend, { testMode: emailTestMode() });
	return await resend.sendEmail(ctx, email);
}
