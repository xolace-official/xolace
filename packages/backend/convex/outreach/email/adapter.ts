import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { primaryEmailOf } from "../../integrations/clerk";
import { clerkUserIdOf } from "../../jobs/clerkUserDeletion";
import { type ActionAdapter, ChannelError } from "../adapters";
import type { EmailTemplate, OutreachIntent } from "../validators";
import {
	allowlisted,
	emailConfigured,
	emailSender,
	emailTestMode,
	TEST_MODE_RECIPIENT,
} from "./config";
import { cancelQueuedEmail } from "./resend";

/**
 * Email, the outreach layer's third channel (#914). No address is ever
 * stored on a Xolace record (ADR 0004): `prepare` decides the template and
 * whose address, and `send` asks Clerk for it, checks the staging allowlist,
 * renders, and hands the email to the Resend component keyed by the delivery,
 * storing its id there in the same commit (`handover`).
 *
 * Failures: no Clerk user or no verified address → `unreachable`; Clerk's
 * 429s, 5xx and network errors, or a failed handover → `retry`; an address
 * off the allowlist or another Clerk 4xx → `permanent`. Resend's own 429s and
 * 5xx happen after the handover and are retried by the component.
 */

const TOO_MANY_REQUESTS = 429;
const SERVER_ERROR = 500;

/** Used when an outreach carries no title. */
const DEFAULT_SUBJECT = "Xolace";

/** The template each email intent renders. */
const TEMPLATES: Partial<Record<OutreachIntent, EmailTemplate>> = {
	welcome: "welcome",
};

/** The email a delivery sends, decided when it's claimed: no address. */
type EmailSend = {
	clerkUserId: string;
	deliveryId: Id<"outreach_deliveries">;
	subject: string;
	template: EmailTemplate;
	/** The plain-text part: the outreach's channel-neutral body. */
	text: string;
};

async function prepare(
	ctx: MutationCtx,
	delivery: Doc<"outreach_deliveries">,
	outreach: Doc<"outreach">
): Promise<EmailSend> {
	const template = TEMPLATES[outreach.intent];
	if (!template) {
		throw new ChannelError("permanent", { code: "no_template" });
	}
	const user = await ctx.db
		.query("users")
		.withIndex("by_emotional_profile", (q) =>
			q.eq("emotionalProfileId", outreach.emotionalProfileId)
		)
		.first();
	const clerkUserId = user && clerkUserIdOf(user.tokenIdentifier);
	if (!clerkUserId) {
		throw new ChannelError("unreachable", { code: "no_clerk_user" });
	}
	return {
		clerkUserId,
		deliveryId: delivery._id,
		subject: outreach.content.title ?? DEFAULT_SUBJECT,
		template,
		text: outreach.content.body,
	};
}

/** A Clerk lookup that failed, as the delivery runner's `ChannelError`. */
function clerkError(status: number | undefined): ChannelError {
	if (
		status === undefined ||
		status === TOO_MANY_REQUESTS ||
		status >= SERVER_ERROR
	) {
		return new ChannelError("retry", {
			...(status !== undefined && { code: `clerk_${status}` }),
		});
	}
	return new ChannelError("permanent", { code: `clerk_${status}` });
}

export const emailAdapter: Omit<ActionAdapter<EmailSend>, "pool"> = {
	/**
	 * Its delivery was drained (account deletion, a wipe) after the handover
	 * committed but before the send was settled. The drain already saw the
	 * id the handover stored and cancelled it; this is a second, harmless
	 * try (#917).
	 */
	afterLost: async (ctx, receipt) => {
		if (receipt.providerMessageId) {
			await cancelQueuedEmail(ctx, receipt.providerMessageId);
		}
	},
	channel: "email",
	configured: emailConfigured,
	deliveryMode: "push",
	prepare,
	runtime: "action",
	send: async (ctx, prepared) => {
		const lookup = await primaryEmailOf(prepared.clerkUserId);
		if (lookup.kind === "missing") {
			throw new ChannelError("unreachable", { code: "no_address" });
		}
		if (lookup.kind === "failed") {
			throw clerkError(lookup.status);
		}
		if (!allowlisted(lookup.address)) {
			throw new ChannelError("permanent", { code: "not_allowlisted" });
		}
		const html = await ctx.runAction(
			internal.outreach.email.render.renderEmail,
			{ template: prepared.template }
		);
		let emailId: string | null;
		try {
			emailId = await ctx.runMutation(
				internal.outreach.email.handover.handOver,
				{
					deliveryId: prepared.deliveryId,
					email: {
						...emailSender(),
						html,
						subject: prepared.subject,
						text: prepared.text,
						to: emailTestMode() ? TEST_MODE_RECIPIENT : lookup.address,
					},
				}
			);
		} catch (error) {
			// Keyed by the delivery, so a retried handover never sends twice.
			// The name only: the error may carry the email's fields.
			console.error(
				"[email] handover to Resend failed",
				error instanceof Error ? error.name : typeof error
			);
			throw new ChannelError("retry", { code: "resend_handover" });
		}
		if (emailId === null) {
			// Drained meanwhile (a wipe, account deletion): nothing was queued,
			// and with no delivery left, nothing records this outcome.
			throw new ChannelError("permanent", { code: "delivery_gone" });
		}
		return { providerMessageId: emailId };
	},
};
