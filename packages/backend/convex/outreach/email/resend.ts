import { type EmailId, Resend, type Status } from "@convex-dev/resend";
import { components, internal } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
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

/**
 * Hand an email to the component; its id there, for webhook events (#916).
 * Only through `handover:handOver`, which stores the id in the same commit.
 */
export async function queueEmail(
	ctx: MutationCtx,
	email: OutgoingEmail
): Promise<string> {
	return await resendClient().sendEmail(ctx, email);
}

/** The component's states for an email it hasn't sent to Resend yet. */
const UNSENT: ReadonlySet<Status> = new Set<Status>(["waiting", "queued"]);

/**
 * Account deletion and a wipe (#917): stop an email the component hasn't
 * sent yet. One already sent, or already gone, is left alone: its copy ages
 * out with the daily cleanup.
 */
export async function cancelQueuedEmail(
	ctx: MutationCtx,
	emailId: string
): Promise<void> {
	const client = resendClient();
	const id = emailId as EmailId;
	const email = await client.status(ctx, id);
	if (email && UNSENT.has(email.status)) {
		await client.cancelEmail(ctx, id);
	}
}
