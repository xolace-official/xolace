import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	type ActionCtx,
	internalAction,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "../../_generated/server";
import type { FollowUpTier } from "../validators";
import { appLink } from "./appLinks";
import {
	botApi,
	FORBIDDEN,
	SECOND_MS,
	TelegramApiError,
	TOO_MANY_REQUESTS,
} from "./botApi";
import {
	ANSWER_BUTTONS,
	CHECK_IN_CLOSED,
	CHECK_IN_CLOSED_TOAST,
	CHECKED_IN,
	nudgeFirstLine,
	REVEAL_BUTTON,
	SUPPORT_RESOURCES_BUTTON,
} from "./copy";

/**
 * A follow-up nudge as a Telegram check-in (#768): the message, its buttons,
 * "What was this about?" and the collapse. A check-in is live from the send
 * until its follow-up stops being open or its link ends; then it's edited to
 * a neutral line with no buttons, so the chat never keeps what was written.
 */

/** A card's nudges, and one nudge's deliveries (one plus a fallback): bounds. */
const MAX_NUDGES_PER_CARD = 10;
const MAX_DELIVERIES_PER_NUDGE = 10;
/** One chat holds a few live check-ins at most; bounds the read. */
const MAX_OPEN_PER_CHAT = 20;

/** A card the follow-up still waits on. Superseded and expired are closed. */
const OPEN_CARD_STATUSES = new Set<Doc<"follow_up_cards">["status"]>([
	"pending",
	"ready",
	"shown",
]);

export const isCardOpen = (card: Doc<"follow_up_cards"> | null) =>
	card !== null && OPEN_CARD_STATUSES.has(card.status);

// ---------------------------------------------------------------------------
// Callback data: an action letter and the delivery id, nothing else.
// ---------------------------------------------------------------------------

const TAP_ACTIONS = {
	h: "heavier",
	l: "lighter",
	r: "reveal",
	s: "still_here",
} as const;
type TapLetter = keyof typeof TAP_ACTIONS;
export type TapAction = (typeof TAP_ACTIONS)[TapLetter];

const LETTER_OF: Record<TapAction, TapLetter> = {
	heavier: "h",
	lighter: "l",
	reveal: "r",
	still_here: "s",
};

/** Within Telegram's 64 chars of `[A-Za-z0-9_-]`. */
const CALLBACK_DATA = /^([hlrs]):([A-Za-z0-9_-]{1,62})$/;

export function callbackData(
	action: TapAction,
	deliveryId: Id<"outreach_deliveries">
): string {
	return `${LETTER_OF[action]}:${deliveryId}`;
}

const isTapLetter = (value: string): value is TapLetter =>
	Object.hasOwn(TAP_ACTIONS, value);

/** Untrusted `callback_data` → an action and a delivery id string, or null. */
export function parseCallbackData(
	data: string | undefined
): { action: TapAction; deliveryId: string } | null {
	const match = data?.match(CALLBACK_DATA);
	if (!match) {
		return null;
	}
	const [, letter, deliveryId] = match;
	if (!(letter && deliveryId && isTapLetter(letter))) {
		return null;
	}
	return { action: TAP_ACTIONS[letter], deliveryId };
}

// ---------------------------------------------------------------------------
// The message
// ---------------------------------------------------------------------------

export const buttonValidator = v.object({
	callback_data: v.optional(v.string()),
	text: v.string(),
	url: v.optional(v.string()),
});
export type Button = Infer<typeof buttonValidator>;
export type Keyboard = Button[][];

export const entityValidator = v.object({
	length: v.number(),
	offset: v.number(),
	type: v.literal("blockquote"),
});

/** An answer a check-in offers as a button. */
export type AnswerAction = keyof typeof ANSWER_BUTTONS;

/** The answers a check-in offers. Acute has no Heavier, like the app. */
export function offeredAnswers(tier: FollowUpTier): readonly AnswerAction[] {
	return tier === "acute"
		? ["lighter", "still_here"]
		: ["lighter", "still_here", "heavier"];
}

/** A nudge's tier, as it was sent; older nudges fall back to the card's. */
export const tierOf = (
	outreach: Doc<"outreach">,
	card: Doc<"follow_up_cards">
): FollowUpTier => outreach.tier ?? card.tier;

/** A check-in's text and buttons, before or after the reveal. */
export function checkInMessage(args: {
	cardText?: string;
	deliveryId: Id<"outreach_deliveries">;
	escalationDerived: boolean;
	firstLine: string;
	tier: FollowUpTier;
}): {
	entities?: Infer<typeof entityValidator>[];
	keyboard: Keyboard;
	text: string;
} {
	const keyboard: Keyboard = [
		offeredAnswers(args.tier).map((answer) => ({
			callback_data: callbackData(answer, args.deliveryId),
			text: ANSWER_BUTTONS[answer],
		})),
	];
	if (args.cardText === undefined) {
		keyboard.push([
			{
				callback_data: callbackData("reveal", args.deliveryId),
				text: REVEAL_BUTTON,
			},
		]);
	}
	if (args.escalationDerived) {
		keyboard.push([
			{ text: SUPPORT_RESOURCES_BUTTON, url: appLink("support") },
		]);
	}
	if (args.cardText === undefined) {
		return { keyboard, text: args.firstLine };
	}
	// The card text, compounding domain and all, as a quote below the first
	// line. Offsets are UTF-16 code units, as JS strings count them.
	const offset = args.firstLine.length + 2;
	return {
		entities: [{ length: args.cardText.length, offset, type: "blockquote" }],
		keyboard,
		text: `${args.firstLine}\n\n${args.cardText}`,
	};
}

/** The nudge's first line: the outreach's Telegram variant, else the tier's. */
export function firstLineOf(outreach: Doc<"outreach">): string {
	return (
		outreach.variants?.telegram?.body ??
		nudgeFirstLine(outreach.tier ?? "standard")
	);
}

const isCheckedIn = (value: string): value is keyof typeof CHECKED_IN =>
	Object.hasOwn(CHECKED_IN, value);

/** What a collapsed check-in says. */
export function collapseText(card: Doc<"follow_up_cards"> | null): string {
	const response = card?.status === "resolved" ? card.userResponse : undefined;
	return response && isCheckedIn(response)
		? CHECKED_IN[response]
		: CHECK_IN_CLOSED;
}

// ---------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------

export const editValidator = v.object({
	chatId: v.string(),
	entities: v.optional(v.array(entityValidator)),
	keyboard: v.array(v.array(buttonValidator)),
	messageId: v.string(),
	text: v.string(),
	/**
	 * Only while this check-in is live: a reveal shows the card text and its
	 * buttons, which a late or retried edit must never put back once the
	 * check-in has collapsed.
	 */
	whileOpen: v.optional(v.id("outreach_deliveries")),
});
export type Edit = Infer<typeof editValidator>;

/** The edits still due: none whose check-in has collapsed since. */
export const dueEdits = internalQuery({
	args: { edits: v.array(editValidator) },
	handler: async (ctx, { edits }) => {
		const due: Edit[] = [];
		for (const edit of edits) {
			const delivery = edit.whileOpen
				? await ctx.db.get("outreach_deliveries", edit.whileOpen)
				: null;
			if (!edit.whileOpen || delivery?.checkInOpen) {
				due.push(edit);
			}
		}
		return due;
	},
	returns: v.array(editValidator),
});

const NOT_MODIFIED = /message is not modified/i;

/**
 * Edit each message in order. "Message is not modified" is success; a 403
 * (blocked, or the chat is gone) is left alone; a 429 waits Telegram's
 * `retry_after` and tries the rest again later. Anything else is logged.
 */
export async function editMessages(
	ctx: ActionCtx,
	planned: readonly Edit[]
): Promise<void> {
	const edits = planned.some((e) => e.whileOpen)
		? await ctx.runQuery(internal.outreach.telegram.checkIn.dueEdits, {
				edits: [...planned],
			})
		: planned;
	for (const [index, edit] of edits.entries()) {
		try {
			await botApi.editMessageText({
				chat_id: edit.chatId,
				message_id: Number(edit.messageId),
				reply_markup: { inline_keyboard: edit.keyboard },
				text: edit.text,
				...(edit.entities && { entities: edit.entities }),
			});
		} catch (error) {
			if (!(error instanceof TelegramApiError)) {
				console.error("Telegram edit failed", error);
				continue;
			}
			if (error.errorCode === TOO_MANY_REQUESTS) {
				await ctx.scheduler.runAfter(
					(error.retryAfter ?? 1) * SECOND_MS,
					internal.outreach.telegram.checkIn.edit,
					{ edits: edits.slice(index) }
				);
				return;
			}
			const settled =
				error.errorCode === FORBIDDEN ||
				NOT_MODIFIED.test(error.description ?? "");
			if (!settled) {
				console.error(`Telegram edit failed (${error.errorCode})`);
			}
		}
	}
}

export const edit = internalAction({
	args: { edits: v.array(editValidator) },
	handler: async (ctx, { edits }) => {
		await editMessages(ctx, edits);
		return null;
	},
	returns: v.null(),
});

// ---------------------------------------------------------------------------
// Collapse
// ---------------------------------------------------------------------------

/** The follow-up a nudge is about, if it still exists. */
export async function cardOfOutreach(
	ctx: QueryCtx,
	outreach: Doc<"outreach"> | null
): Promise<Doc<"follow_up_cards"> | null> {
	return outreach?.followUpId
		? await ctx.db.get("follow_up_cards", outreach.followUpId)
		: null;
}

/** The card a check-in delivery is about, if it still exists. */
export async function cardOf(
	ctx: QueryCtx,
	delivery: Doc<"outreach_deliveries">
): Promise<Doc<"follow_up_cards"> | null> {
	return await cardOfOutreach(
		ctx,
		await ctx.db.get("outreach", delivery.outreachId)
	);
}

/** Mark a check-in no longer live. */
async function markCollapsed(
	ctx: MutationCtx,
	deliveryId: Id<"outreach_deliveries">
): Promise<void> {
	await ctx.db.patch("outreach_deliveries", deliveryId, {
		checkInOpen: undefined,
		collapsedAt: Date.now(),
	});
}

/** The edit that collapses a sent check-in. */
export function collapseEdit(
	delivery: Doc<"outreach_deliveries">,
	card: Doc<"follow_up_cards"> | null
): Edit | null {
	if (!(delivery.providerChatId && delivery.providerMessageId)) {
		return null;
	}
	return {
		chatId: delivery.providerChatId,
		keyboard: [],
		messageId: delivery.providerMessageId,
		text: collapseText(card),
	};
}

/**
 * Collapse these check-ins: no longer live, and edited (after this commits)
 * to their neutral line with no buttons.
 */
export async function collapse(
	ctx: MutationCtx,
	deliveries: readonly Doc<"outreach_deliveries">[]
): Promise<void> {
	const edits: Edit[] = [];
	for (const delivery of deliveries) {
		await markCollapsed(ctx, delivery._id);
		const collapsed = collapseEdit(delivery, await cardOf(ctx, delivery));
		if (collapsed) {
			edits.push(collapsed);
		}
	}
	if (edits.length > 0) {
		await ctx.scheduler.runAfter(0, internal.outreach.telegram.checkIn.edit, {
			edits,
		});
	}
}

/** End these check-ins without an edit: their messages are being deleted. */
export async function retire(
	ctx: MutationCtx,
	deliveries: readonly Doc<"outreach_deliveries">[]
): Promise<void> {
	for (const delivery of deliveries) {
		await markCollapsed(ctx, delivery._id);
	}
}

/** Collapse a follow-up's live check-ins: it was answered or closed. */
export async function collapseCard(
	ctx: MutationCtx,
	cardId: Id<"follow_up_cards">
): Promise<void> {
	const nudges = await ctx.db
		.query("outreach")
		.withIndex("by_follow_up", (q) => q.eq("followUpId", cardId))
		.take(MAX_NUDGES_PER_CARD);
	const open: Doc<"outreach_deliveries">[] = [];
	for (const nudge of nudges) {
		const deliveries = await ctx.db
			.query("outreach_deliveries")
			.withIndex("by_outreach", (q) => q.eq("outreachId", nudge._id))
			.take(MAX_DELIVERIES_PER_NUDGE);
		open.push(...deliveries.filter((d) => d.checkInOpen));
	}
	await collapse(ctx, open);
}

/** A chat's live check-ins. */
export async function openCheckInsOf(
	ctx: QueryCtx,
	chatId: string
): Promise<Doc<"outreach_deliveries">[]> {
	return await ctx.db
		.query("outreach_deliveries")
		.withIndex("by_chat_check_in", (q) =>
			q.eq("providerChatId", chatId).eq("checkInOpen", true)
		)
		.take(MAX_OPEN_PER_CHAT);
}

/** Collapse every live check-in in a chat: its link ended. */
export async function collapseChat(
	ctx: MutationCtx,
	chatId: string
): Promise<void> {
	await collapse(ctx, await openCheckInsOf(ctx, chatId));
}

// ---------------------------------------------------------------------------
// "What was this about?"
// ---------------------------------------------------------------------------

/**
 * What a tap needs sent: edits to its messages, its toast if any, and the
 * card it answered, when it did (an AI reply follows, #770).
 */
export type TapReply = {
	answered?: { cardId: Id<"follow_up_cards">; response: AnswerAction };
	edits: Edit[];
	toast?: string;
};

export const NO_REPLY: TapReply = { edits: [] };

/** What a tap names, from which chat, linked to which profile. */
export type TapTarget = {
	chatId: string;
	deliveryId: string;
	profileId: Id<"emotional_profiles">;
};

/** A tapped check-in, everything in the tap checked against the database. */
export type TappedCheckIn = {
	card: Doc<"follow_up_cards"> | null;
	delivery: Doc<"outreach_deliveries"> & { providerMessageId: string };
	outreach: Doc<"outreach">;
};

/**
 * The check-in a tap from `chatId`, linked to `profileId`, names. Everything
 * in a tap is untrusted, so the delivery must be this chat's own sent
 * Telegram message, and a nudge to this profile. Null otherwise.
 */
export async function tappedCheckIn(
	ctx: QueryCtx,
	args: TapTarget
): Promise<TappedCheckIn | null> {
	const deliveryId = ctx.db.normalizeId("outreach_deliveries", args.deliveryId);
	const delivery = deliveryId
		? await ctx.db.get("outreach_deliveries", deliveryId)
		: null;
	const providerMessageId = delivery?.providerMessageId;
	if (
		!(
			delivery &&
			providerMessageId &&
			delivery.channel === "telegram" &&
			delivery.providerChatId === args.chatId
		)
	) {
		return null;
	}
	const outreach = await ctx.db.get("outreach", delivery.outreachId);
	if (
		!outreach ||
		outreach.intent !== "nudge" ||
		outreach.emotionalProfileId !== args.profileId
	) {
		return null;
	}
	return {
		card: await cardOfOutreach(ctx, outreach),
		delivery: { ...delivery, providerMessageId },
		outreach,
	};
}

/** Whether a tap on this check-in may still act on its card. */
export const isLiveCheckIn = (
	tapped: TappedCheckIn
): tapped is TappedCheckIn & { card: Doc<"follow_up_cards"> } =>
	tapped.delivery.checkInOpen === true && isCardOpen(tapped.card);

/**
 * A tap on a check-in that can't take it: the toast, and the collapse sent
 * again (the first edit may have been lost, or the tap raced it).
 */
export async function refuseTap(
	ctx: MutationCtx,
	{ card, delivery }: TappedCheckIn,
	toast: string
): Promise<TapReply> {
	if (delivery.checkInOpen) {
		await markCollapsed(ctx, delivery._id);
	}
	const collapsed = collapseEdit(delivery, card);
	return { edits: collapsed ? [collapsed] : [], toast };
}

/**
 * A reveal tap: edit the same message to add the card text as a quote and
 * drop the reveal button. Never a new message, so never a new notification.
 * A tap on a closed check-in gets the closed toast and the collapse again; a
 * second tap does nothing.
 */
export async function reveal(
	ctx: MutationCtx,
	args: TapTarget
): Promise<TapReply> {
	const tapped = await tappedCheckIn(ctx, args);
	if (!tapped) {
		return NO_REPLY;
	}
	const { delivery, outreach } = tapped;
	if (!isLiveCheckIn(tapped)) {
		return await refuseTap(ctx, tapped, CHECK_IN_CLOSED_TOAST);
	}
	const { card } = tapped;
	if (delivery.revealedAt !== undefined) {
		return NO_REPLY;
	}
	await ctx.db.patch("outreach_deliveries", delivery._id, {
		revealedAt: Date.now(),
	});
	const message = checkInMessage({
		cardText: card.cardText,
		deliveryId: delivery._id,
		escalationDerived: card.escalationDerived,
		firstLine: firstLineOf(outreach),
		tier: tierOf(outreach, card),
	});
	return {
		edits: [
			{
				chatId: args.chatId,
				keyboard: message.keyboard,
				messageId: delivery.providerMessageId,
				text: message.text,
				whileOpen: delivery._id,
				...(message.entities && { entities: message.entities }),
			},
		],
	};
}
