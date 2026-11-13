import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction, internalMutation } from "../../_generated/server";
import { rateLimiter } from "../../lib/rateLimits";
import { botApi } from "./botApi";
import {
	type Edit,
	editMessages,
	editValidator,
	parseCallbackData,
	reveal,
} from "./checkIn";
import { identityOfChat, isLive, revokeIdentity } from "./lifecycle";
import { type Line, lineValidator, sendLines } from "./lines";
import { redeemLinkToken } from "./link";
import { asUpdate, strippedPayload } from "./webhook";

/**
 * Inbound Telegram updates (#765), one at a time on the `telegramInbound`
 * pool. Handled so far: `/start <token>` in a private chat links it (#766);
 * blocking the bot revokes the link, and a linked chat's `/stop` and `/help`
 * (#767). A chat with no linked identity gets one fixed reply per 24 h, a
 * revoked one its own; no safeguard, no escalation and no text kept. A
 * check-in's "What was this about?" edits it in place (#768). Answer taps
 * and replies arrive with their own tickets and are left `ignored` until then.
 */

/** `/stop` or `/help`, bare or as `/stop@bot`, with anything after it. */
const LINKED_COMMAND = /^\/(stop|help)(?:@\w+)?(?:\s|$)/;

/** What an update needs sent once it's claimed. */
const replyValidator = v.object({
	/** A tap's `answerCallbackQuery`, with its toast if any. */
	callback: v.optional(
		v.object({ id: v.string(), toast: v.optional(v.string()) })
	),
	edits: v.array(editValidator),
	lines: v.array(lineValidator),
});
type Reply = Infer<typeof replyValidator>;

/**
 * Decide what an update needs and close it, in one transaction: the payload
 * shrinks to its id and the link token's hash is dropped. Links are made and
 * revoked here, and a once-a-day reply takes its slot before it is sent.
 * The lines are sent after this commits and never retried, so no line is
 * ever sent twice.
 */
export const claimUpdate = internalMutation({
	args: { eventId: v.id("inbound_events") },
	handler: async (ctx, { eventId }): Promise<Reply> => {
		const event = await ctx.db.get("inbound_events", eventId);
		if (event?.status !== "received") {
			return { edits: [], lines: [] };
		}
		const chatId = event.externalId;
		const update = asUpdate(event.payload);
		const close = async (
			status: "ignored" | "processed",
			lines: Line[],
			tap?: { callback: Reply["callback"]; edits: Edit[] }
		): Promise<Reply> => {
			await ctx.db.patch("inbound_events", eventId, {
				linkTokenHash: undefined,
				payload: update ? strippedPayload(update.update_id) : {},
				status,
			});
			return {
				edits: tap?.edits ?? [],
				lines,
				...(tap?.callback && { callback: tap.callback }),
			};
		};

		// A button tap. Only a linked chat's reveal does anything yet.
		const tap = update?.callback_query;
		if (tap) {
			const identity = await identityOfChat(ctx, chatId);
			const parsed = parseCallbackData(tap.data);
			const revealed =
				identity && isLive(identity) && parsed?.action === "reveal"
					? await reveal(ctx, {
							chatId,
							deliveryId: parsed.deliveryId,
							profileId: identity.emotionalProfileId,
						})
					: null;
			return await close(revealed ? "processed" : "ignored", [], {
				callback: {
					id: tap.id,
					...(revealed?.toast && { toast: revealed.toast }),
				},
				edits: revealed?.edits ?? [],
			});
		}

		// Blocking the bot. Unblocking changes nothing: it never relinks.
		const member = update?.my_chat_member;
		if (member) {
			const identity =
				member.chat.type === "private" &&
				member.new_chat_member.status === "kicked"
					? await identityOfChat(ctx, chatId)
					: null;
			const revoked =
				identity !== null && (await revokeIdentity(ctx, identity, "blocked"));
			return await close(revoked ? "processed" : "ignored", []);
		}

		const message = update?.message;
		if (message?.chat.type !== "private") {
			return await close("ignored", []);
		}
		if (event.linkTokenHash !== undefined) {
			const lines = await redeemLinkToken(ctx, {
				chatId,
				displayHandle: message.from?.username,
				telegramUserId: message.from && String(message.from.id),
				tokenHash: event.linkTokenHash,
			});
			if (lines) {
				return await close("processed", lines);
			}
			const { ok } = await rateLimiter.limit(ctx, "telegramExpiredLinkReply", {
				key: chatId,
			});
			return ok
				? await close("processed", [{ chatId, kind: "expired" }])
				: await close("ignored", []);
		}

		const identity = await identityOfChat(ctx, chatId);
		if (identity && isLive(identity)) {
			// Paused still answers: pausing means "don't reach out".
			const command = message.text?.match(LINKED_COMMAND)?.[1];
			if (command === "stop") {
				await revokeIdentity(ctx, identity, "user_telegram");
				return await close("processed", [{ chatId, kind: "stop" }]);
			}
			if (command === "help") {
				return await close("processed", [{ chatId, kind: "help" }]);
			}
			return await close("ignored", []);
		}

		// A stranger, or a chat whose link was revoked: one line a day.
		const [kind, bucket] = identity
			? (["revoked", "telegramRevokedReply"] as const)
			: (["stranger", "telegramStrangerReply"] as const);
		const { ok } = await rateLimiter.limit(ctx, bucket, { key: chatId });
		return ok
			? await close("processed", [{ chatId, kind }])
			: await close("ignored", []);
	},
	returns: replyValidator,
});

/** Never retried: a lost toast is harmless. */
async function answerTap(callback: NonNullable<Reply["callback"]>) {
	try {
		await botApi.answerCallbackQuery({
			callback_query_id: callback.id,
			...(callback.toast && { text: callback.toast }),
		});
	} catch (error) {
		console.error("Telegram answerCallbackQuery failed", error);
	}
}

export const processUpdate = internalAction({
	args: { eventId: v.id("inbound_events") },
	handler: async (ctx, { eventId }) => {
		const reply = await ctx.runMutation(
			internal.outreach.telegram.inbound.claimUpdate,
			{ eventId }
		);
		if (reply.callback) {
			// First, so the button stops spinning.
			await answerTap(reply.callback);
		}
		await editMessages(ctx, reply.edits);
		await sendLines(ctx, reply.lines);
		return null;
	},
	returns: v.null(),
});
