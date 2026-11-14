import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx, MutationCtx } from "../../_generated/server";
import { type ActionAdapter, ChannelError } from "../adapters";
import { quietWindowEndsAt } from "../quietWindow";
import { appLink } from "./appLinks";
import { telegramConfigured } from "./bot";
import {
	botApi,
	FORBIDDEN,
	SECOND_MS,
	TelegramApiError,
	TOO_MANY_REQUESTS,
} from "./botApi";
import {
	cardOfOutreach,
	checkInMessage,
	collapse,
	firstLineOf,
	isCardOpen,
	type Keyboard,
	openCheckInsOf,
} from "./checkIn";
import { OPEN_XOLACE_BUTTON } from "./copy";
import {
	identitiesOf,
	identityOfChat,
	isLive,
	rememberSent,
} from "./lifecycle";

/**
 * Telegram, the outreach layer's second channel (#768). A follow-up nudge
 * goes out as a check-in with answer buttons; a gentle return or pattern
 * nudge as push's text with one `Open Xolace` button. Every message is
 * `protect_content`; only an acute nudge inside the quiet window is silent.
 * A 403 revokes the link `unreachable`; a 429 waits Telegram's `retry_after`.
 */

const SERVER_ERROR = 500;

/** The `sendMessage` a delivery makes, decided when it's claimed. */
type TelegramSend = {
	chat_id: string;
	disable_notification?: boolean;
	protect_content: true;
	reply_markup: { inline_keyboard: Keyboard };
	text: string;
};

async function loadNotifications(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<Doc<"preferences">["notifications"] | undefined> {
	const prefs = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
	return prefs?.notifications;
}

async function prepare(
	ctx: MutationCtx,
	delivery: Doc<"outreach_deliveries">,
	outreach: Doc<"outreach">
): Promise<TelegramSend> {
	// The link can end, or pause, between routing and sending.
	const identity = (
		await identitiesOf(ctx, outreach.emotionalProfileId, "telegram")
	).find((i) => i.status === "active");
	if (!identity) {
		throw new ChannelError("permanent", { code: "not_linked" });
	}
	const base = { chat_id: identity.externalId, protect_content: true as const };

	if (outreach.intent !== "nudge") {
		return {
			...base,
			reply_markup: {
				inline_keyboard: [[{ text: OPEN_XOLACE_BUTTON, url: appLink("app") }]],
			},
			text: outreach.variants?.telegram?.body ?? outreach.content.body,
		};
	}

	const card = await cardOfOutreach(ctx, outreach);
	const tier = outreach.tier ?? card?.tier ?? "standard";
	const message = checkInMessage({
		deliveryId: delivery._id,
		escalationDerived: card?.escalationDerived ?? false,
		firstLine: firstLineOf(outreach),
		tier,
	});
	// Only an acute nudge goes out inside the quiet window; it arrives silently.
	const silent =
		tier === "acute" &&
		quietWindowEndsAt(
			await loadNotifications(ctx, outreach.emotionalProfileId),
			Date.now()
		) !== null;
	return {
		...base,
		reply_markup: { inline_keyboard: message.keyboard },
		text: message.text,
		...(silent && { disable_notification: true }),
	};
}

/** A Bot API failure as the delivery runner's `ChannelError`. */
async function channelError(
	ctx: ActionCtx,
	error: unknown,
	chatId: string
): Promise<ChannelError> {
	if (!(error instanceof TelegramApiError)) {
		// The network, not Telegram: try again.
		return new ChannelError("retry", { code: "network" });
	}
	const code =
		error.errorCode === undefined ? undefined : String(error.errorCode);
	if (error.errorCode === FORBIDDEN) {
		await ctx.runMutation(
			internal.outreach.telegram.lifecycle.markUnreachable,
			{
				chatId,
			}
		);
		return new ChannelError("unreachable", { code });
	}
	if (error.errorCode === TOO_MANY_REQUESTS) {
		return new ChannelError("retry", {
			code,
			...(error.retryAfter !== undefined && {
				afterMs: error.retryAfter * SECOND_MS,
			}),
		});
	}
	if (error.errorCode !== undefined && error.errorCode >= SERVER_ERROR) {
		return new ChannelError("retry", { code });
	}
	return new ChannelError("permanent", { code });
}

/**
 * A check-in is live once it's sent, unless its follow-up closed or its link
 * ended while it was on its way: then it collapses straight away. Only the
 * newest check-in in a chat is live.
 */
async function afterSent(
	ctx: MutationCtx,
	deliveryId: Id<"outreach_deliveries">
): Promise<void> {
	const delivery = await ctx.db.get("outreach_deliveries", deliveryId);
	const outreach =
		delivery && (await ctx.db.get("outreach", delivery.outreachId));
	const chatId = delivery?.providerChatId;
	if (chatId && delivery.providerMessageId) {
		await rememberSent(ctx, chatId, delivery.providerMessageId);
	}
	if (!(delivery && chatId && outreach?.intent === "nudge")) {
		return;
	}
	const card = await cardOfOutreach(ctx, outreach);
	const identity = await identityOfChat(ctx, chatId);
	const live =
		isCardOpen(card) &&
		identity !== null &&
		isLive(identity) &&
		identity.emotionalProfileId === outreach.emotionalProfileId;
	if (!live) {
		await collapse(ctx, [delivery]);
		return;
	}
	await collapse(ctx, await openCheckInsOf(ctx, chatId));
	await ctx.db.patch("outreach_deliveries", deliveryId, { checkInOpen: true });
}

export const telegramAdapter: Omit<ActionAdapter<TelegramSend>, "pool"> = {
	afterSent,
	channel: "telegram",
	configured: telegramConfigured,
	deliveryMode: "push",
	prepare,
	runtime: "action",
	send: async (ctx, prepared) => {
		try {
			const message = await botApi.sendMessage(prepared);
			return {
				providerChatId: prepared.chat_id,
				providerMessageId: String(message.message_id),
			};
		} catch (error) {
			throw await channelError(ctx, error, prepared.chat_id);
		}
	},
};
