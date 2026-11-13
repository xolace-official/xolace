import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction, internalMutation } from "../../_generated/server";
import { rateLimiter } from "../../lib/rateLimits";
import { botApi, TelegramApiError } from "./botApi";
import { STRANGER_REPLY } from "./copy";
import { asUpdate, strippedPayload } from "./webhook";

/**
 * Inbound Telegram updates (#765), one at a time on the `telegramInbound`
 * pool. For now only strangers are handled: a private chat with no linked
 * identity gets one fixed reply per 24 h, with no safeguard, no escalation
 * and no text kept. Linked chats, `/start <token>` (#766), taps and replies
 * arrive with their own tickets and are left `ignored` until then.
 */

/** Telegram's "the user blocked the bot" (and other forbidden sends). */
const FORBIDDEN = 403;

/**
 * Decide what an update needs and close it, in one transaction: the payload
 * shrinks to its id, and a stranger reply takes the chat's 24 h slot before
 * it is sent. A send that then fails isn't retried, so a stranger never gets
 * the reply twice.
 */
export const claimUpdate = internalMutation({
	args: { eventId: v.id("inbound_events") },
	handler: async (ctx, { eventId }) => {
		const event = await ctx.db.get("inbound_events", eventId);
		if (event?.status !== "received") {
			return null;
		}
		const update = asUpdate(event.payload);
		const close = (status: "ignored" | "processed") =>
			ctx.db.patch("inbound_events", eventId, {
				payload: update ? strippedPayload(update.update_id) : {},
				status,
			});

		if (update?.message?.chat.type !== "private") {
			await close("ignored");
			return null;
		}
		const identity = await ctx.db
			.query("channel_identities")
			.withIndex("by_channel_external", (q) =>
				q.eq("channel", "telegram").eq("externalId", event.externalId)
			)
			.first();
		if (identity) {
			await close("ignored");
			return null;
		}
		const { ok } = await rateLimiter.limit(ctx, "telegramStrangerReply", {
			key: event.externalId,
		});
		await close(ok ? "processed" : "ignored");
		return ok ? event.externalId : null;
	},
	// The chat to send the stranger reply to, if any.
	returns: v.union(v.string(), v.null()),
});

export const processUpdate = internalAction({
	args: { eventId: v.id("inbound_events") },
	handler: async (ctx, { eventId }) => {
		const strangerChat = await ctx.runMutation(
			internal.outreach.telegram.inbound.claimUpdate,
			{ eventId }
		);
		if (strangerChat === null) {
			return null;
		}
		try {
			await botApi.sendMessage({
				chat_id: strangerChat,
				protect_content: true,
				text: STRANGER_REPLY,
			});
		} catch (error) {
			// The slot is taken, so a retry wouldn't resend: log and move on.
			// Blocked before the reply landed is nothing to report.
			if (
				!(error instanceof TelegramApiError && error.errorCode === FORBIDDEN)
			) {
				console.error("Telegram stranger reply failed", error);
			}
		}
		return null;
	},
	returns: v.null(),
});
