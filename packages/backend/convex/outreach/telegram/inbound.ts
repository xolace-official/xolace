import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction, internalMutation } from "../../_generated/server";
import { rateLimiter } from "../../lib/rateLimits";
import { answer } from "./answer";
import { botApi } from "./botApi";
import {
	type Edit,
	editMessages,
	editValidator,
	NO_REPLY,
	parseCallbackData,
	reveal,
} from "./checkIn";
import { identityOfChat, isLive, revokeIdentity } from "./lifecycle";
import { type Line, lineValidator, sendLines } from "./lines";
import { redeemLinkToken } from "./link";
import {
	type ReplyJob,
	reflectionWindow,
	replyJobValidator,
	respond,
} from "./reply";
import { asUpdate, strippedPayload } from "./webhook";

/**
 * Inbound Telegram updates (#765), one at a time on the `telegramInbound`
 * pool. Handled so far: `/start <token>` in a private chat links it (#766);
 * blocking the bot revokes the link, and a linked chat's `/stop` and `/help`
 * (#767). A chat with no linked identity gets one fixed reply per 24 h, a
 * revoked one its own; no safeguard, no escalation and no text kept. A
 * check-in's "What was this about?" edits it in place (#768), and an answer
 * button resolves its follow-up (#769). The answer and any other text from
 * a linked chat get an AI reply (#770), sent after the claim commits; texts
 * wait out a burst first, and replies are capped per day (#771).
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
	/** An AI reply to write and send (#770). */
	respond: v.optional(replyJobValidator),
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
			tap?: { callback?: Reply["callback"]; edits: Edit[] },
			respondWith?: ReplyJob
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
				...(respondWith && { respond: respondWith }),
			};
		};

		// A button tap, on a linked chat's own check-in: an answer or a reveal.
		const tap = update?.callback_query;
		if (tap) {
			const identity = await identityOfChat(ctx, chatId);
			const parsed = parseCallbackData(tap.data);
			let reply = NO_REPLY;
			if (identity && isLive(identity) && parsed) {
				const target = {
					chatId,
					deliveryId: parsed.deliveryId,
					profileId: identity.emotionalProfileId,
				};
				reply =
					parsed.action === "reveal"
						? await reveal(ctx, target)
						: await answer(ctx, { ...target, response: parsed.action });
			}
			const { answered } = reply;
			let job: ReplyJob | undefined;
			if (identity && answered) {
				// Lighter opens the "what helped" window; any other answer closes it.
				await ctx.db.patch("channel_identities", identity._id, {
					awaitingReflection: reflectionWindow(
						answered.response,
						answered.cardId,
						Date.now()
					),
				});
				job = {
					chatId,
					identityId: identity._id,
					linkedAt: identity.linkedAt,
					trigger: {
						answer: answered.response,
						cardId: answered.cardId,
						kind: "tap",
					},
				};
			}
			// Forged, foreign or repeated taps change nothing: `ignored`.
			const acted =
				job !== undefined ||
				reply.toast !== undefined ||
				reply.edits.length > 0;
			return await close(
				acted ? "processed" : "ignored",
				[],
				{
					callback: {
						id: tap.id,
						...(reply.toast && { toast: reply.toast }),
					},
					edits: reply.edits,
				},
				job
			);
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
				return await close("processed", [
					{ chatId, kind: "help", linkedAt: identity.linkedAt },
				]);
			}
			const text = message.text?.trim();
			if (!text) {
				return await close("ignored", []);
			}
			// Only the next text inside a Lighter's window can be what helped.
			const now = Date.now();
			const window = identity.awaitingReflection;
			await ctx.db.patch("channel_identities", identity._id, {
				awaitingReflection: undefined,
				lastInboundAt: now,
			});
			return await close("processed", [], undefined, {
				chatId,
				identityId: identity._id,
				linkedAt: identity.linkedAt,
				trigger: {
					inboundEventId: eventId,
					kind: "text",
					receivedAt: now,
					text,
					...(window &&
						window.until > now && { reflectionCardId: window.cardId }),
				},
			});
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
		// The claim has committed and stripped the payload, so a pool retry
		// would find nothing to do: from here no step may throw past the next.
		const steps: [string, () => Promise<void>][] = [
			// The toast first, so the button stops spinning.
			[
				"tap",
				async () => {
					if (reply.callback) {
						await answerTap(reply.callback);
					}
				},
			],
			["edits", () => editMessages(ctx, reply.edits)],
			["lines", () => sendLines(ctx, reply.lines)],
			[
				"reply",
				async () => {
					if (reply.respond) {
						await respond(ctx, reply.respond);
					}
				},
			],
		];
		for (const [name, step] of steps) {
			try {
				await step();
			} catch (error) {
				console.error(`[telegram] inbound ${name} failed`, error);
			}
		}
		return null;
	},
	returns: v.null(),
});
