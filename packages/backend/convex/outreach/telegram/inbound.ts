import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction, internalMutation } from "../../_generated/server";
import { rateLimiter } from "../../lib/rateLimits";
import { botApi, TelegramApiError } from "./botApi";
import {
	EXPIRED_LINK_REPLY,
	LINKED_COMMANDS,
	STRANGER_REPLY,
	WELCOME,
} from "./copy";
import { redeemLinkToken } from "./link";
import { asUpdate, strippedPayload } from "./webhook";

/**
 * Inbound Telegram updates (#765), one at a time on the `telegramInbound`
 * pool. Handled so far: `/start <token>` in a private chat links it (#766);
 * a private chat with no linked identity gets one fixed reply per 24 h, with
 * no safeguard, no escalation and no text kept. Linked chats' taps and
 * replies arrive with their own tickets and are left `ignored` until then.
 */

/** Telegram's "the user blocked the bot" (and other forbidden sends). */
const FORBIDDEN = 403;

/** A fixed line to send, and where. */
const replyValidator = v.object({
	chatId: v.string(),
	kind: v.union(
		v.literal("expired"),
		v.literal("stranger"),
		v.literal("welcome")
	),
});
type Reply = Infer<typeof replyValidator>;

const REPLY_TEXT: Record<Reply["kind"], string> = {
	expired: EXPIRED_LINK_REPLY,
	stranger: STRANGER_REPLY,
	welcome: WELCOME,
};

/**
 * Decide what an update needs and close it, in one transaction: the payload
 * shrinks to its id and the link token's hash is dropped. A link is redeemed
 * here, and a stranger reply takes the chat's 24 h slot before it is sent.
 * A send that then fails isn't retried, so no line is ever sent twice.
 */
export const claimUpdate = internalMutation({
	args: { eventId: v.id("inbound_events") },
	handler: async (ctx, { eventId }): Promise<Reply | null> => {
		const event = await ctx.db.get("inbound_events", eventId);
		if (event?.status !== "received") {
			return null;
		}
		const update = asUpdate(event.payload);
		const close = (status: "ignored" | "processed") =>
			ctx.db.patch("inbound_events", eventId, {
				linkTokenHash: undefined,
				payload: update ? strippedPayload(update.update_id) : {},
				status,
			});

		const message = update?.message;
		if (message?.chat.type !== "private") {
			await close("ignored");
			return null;
		}
		if (event.linkTokenHash !== undefined) {
			const linked = await redeemLinkToken(ctx, {
				chatId: event.externalId,
				displayHandle: message.from?.username,
				telegramUserId: message.from && String(message.from.id),
				tokenHash: event.linkTokenHash,
			});
			if (linked) {
				await close("processed");
				return { chatId: event.externalId, kind: "welcome" };
			}
			const { ok } = await rateLimiter.limit(ctx, "telegramExpiredLinkReply", {
				key: event.externalId,
			});
			await close(ok ? "processed" : "ignored");
			return ok ? { chatId: event.externalId, kind: "expired" } : null;
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
		return ok ? { chatId: event.externalId, kind: "stranger" } : null;
	},
	returns: v.union(replyValidator, v.null()),
});

export const processUpdate = internalAction({
	args: { eventId: v.id("inbound_events") },
	handler: async (ctx, { eventId }) => {
		const reply = await ctx.runMutation(
			internal.outreach.telegram.inbound.claimUpdate,
			{ eventId }
		);
		if (reply === null) {
			return null;
		}
		try {
			await botApi.sendMessage({
				chat_id: reply.chatId,
				protect_content: true,
				text: REPLY_TEXT[reply.kind],
			});
		} catch (error) {
			// The update is closed, so a retry wouldn't resend: log and move on.
			// Blocked before the reply landed is nothing to report.
			if (
				!(error instanceof TelegramApiError && error.errorCode === FORBIDDEN)
			) {
				console.error(`Telegram ${reply.kind} reply failed`, error);
			}
		}
		if (reply.kind === "welcome") {
			try {
				// `/stop` shows only in linked chats.
				await botApi.setMyCommands({
					commands: [...LINKED_COMMANDS],
					scope: { chat_id: reply.chatId, type: "chat" },
				});
			} catch (error) {
				console.error("Telegram linked-chat commands failed", error);
			}
		}
		return null;
	},
	returns: v.null(),
});
