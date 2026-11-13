import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	type ActionCtx,
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "../../_generated/server";
import { checkWordsSafety } from "../../ai/intake/read";
import { writeReply } from "../../ai/telegram/reply";
import type {
	ReplyCard,
	ReplyTrigger,
	ReplyTurn,
	TapAnswer,
} from "../../ai/telegram/replyPrompt";
import {
	REFLECTION_MAX_LENGTH,
	resolveCardCore,
} from "../../followUps/resolve";
import { domainValidator, reachValidator } from "../../lib/validators";
import { talkPreload } from "../../talk/remember";
import { appLink } from "./appLinks";
import { botApi, FORBIDDEN, TelegramApiError } from "./botApi";
import { cardOf, isCardOpen, type Keyboard, openCheckInsOf } from "./checkIn";
import {
	ANSWER_BUTTONS,
	CRISIS_HOLDING_LINE,
	OPEN_XOLACE_BUTTON,
	REPLY_FAILED,
	SUPPORT_RESOURCES_BUTTON,
} from "./copy";
import { isLive } from "./lifecycle";

/**
 * AI replies on Telegram (#770): to an answer tap, and to free text from a
 * linked chat (active or paused). Every text goes through the safeguard
 * first. The reply is single-turn, on Talk's model and memory preload, read
 * only: nothing is written to sessions, memory or Understanding. All this
 * keeps is the chat's last few turns (24 h at most) and, after a Lighter, the
 * next text as that card's "what helped".
 */

/** After a Lighter, how long the next text counts as what helped. */
export const REFLECTION_WINDOW_MS = 30 * 60 * 1000;
/** The turns a reply sees, each way together. */
const TURNS_KEPT = 6;
const TURNS_TTL_MS = 24 * 60 * 60 * 1000;
/** A turn is kept to its opening: enough for context. */
const TURN_MAX_CHARS = 500;
/** What the model and the safeguard read of one text. */
export const TEXT_MAX_CHARS = REFLECTION_MAX_LENGTH;

const tapAnswerValidator = v.union(
	v.literal("lighter"),
	v.literal("still_here"),
	v.literal("heavier")
);

/** What a claimed update leaves for a reply, decided in its transaction. */
export const replyJobValidator = v.object({
	chatId: v.string(),
	identityId: v.id("channel_identities"),
	trigger: v.union(
		v.object({
			answer: tapAnswerValidator,
			cardId: v.id("follow_up_cards"),
			kind: v.literal("tap"),
		}),
		v.object({
			kind: v.literal("text"),
			/** Set when this is the first text inside a Lighter's window. */
			reflectionCardId: v.optional(v.id("follow_up_cards")),
			text: v.string(),
		})
	),
});
export type ReplyJob = Infer<typeof replyJobValidator>;

// ---------------------------------------------------------------------------
// Context, read only
// ---------------------------------------------------------------------------

const turnValidator = v.object({
	role: v.union(v.literal("person"), v.literal("xolace")),
	text: v.string(),
});

const contextValidator = v.object({
	card: v.union(
		v.null(),
		v.object({
			answer: v.optional(tapAnswerValidator),
			domain: v.optional(domainValidator),
			text: v.string(),
		})
	),
	memory: v.string(),
	reach: reachValidator,
	turns: v.array(turnValidator),
});

/** The open check-in's card in this chat, else the profile's latest card. */
async function cardInView(
	ctx: QueryCtx,
	identity: Doc<"channel_identities">
): Promise<Doc<"follow_up_cards"> | null> {
	for (const delivery of await openCheckInsOf(ctx, identity.externalId)) {
		const card = await cardOf(ctx, delivery);
		if (
			isCardOpen(card) &&
			card?.emotionalProfileId === identity.emotionalProfileId
		) {
			return card;
		}
	}
	return await ctx.db
		.query("follow_up_cards")
		.withIndex("by_profile_created", (q) =>
			q.eq("emotionalProfileId", identity.emotionalProfileId)
		)
		.order("desc")
		.first();
}

const isTapAnswer = (value: string | undefined): value is TapAnswer =>
	value === "lighter" || value === "still_here" || value === "heavier";

const asReplyCard = (card: Doc<"follow_up_cards">): ReplyCard => ({
	text: card.cardText,
	...(card.compoundingDomain && { domain: card.compoundingDomain }),
	...(card.status === "resolved" &&
		isTapAnswer(card.userResponse) && { answer: card.userResponse }),
});

/** A turn is context only while it's recent. */
const recentTurns = (identity: Doc<"channel_identities">, now: number) =>
	(identity.recentTurns ?? []).filter((t) => t.at > now - TURNS_TTL_MS);

/** What a reply knows, or null once the link is no longer live. */
export const replyContext = internalQuery({
	args: {
		cardId: v.optional(v.id("follow_up_cards")),
		identityId: v.id("channel_identities"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!(identity && isLive(identity))) {
			return null;
		}
		const profile = await ctx.db.get(
			"emotional_profiles",
			identity.emotionalProfileId
		);
		if (!profile) {
			return null;
		}
		const tapped = args.cardId
			? await ctx.db.get("follow_up_cards", args.cardId)
			: null;
		const card =
			tapped?.emotionalProfileId === profile._id
				? tapped
				: await cardInView(ctx, identity);
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();
		const now = Date.now();
		return {
			card: card ? asReplyCard(card) : null,
			memory: (await talkPreload(ctx, profile, now)).talkMemory,
			reach: prefs?.notifications?.reach ?? "warm",
			turns: recentTurns(identity, now).map(({ role, text }) => ({
				role,
				text,
			})),
		};
	},
	returns: v.union(v.null(), contextValidator),
});

// ---------------------------------------------------------------------------
// The two writes: what helped, and the recent turns
// ---------------------------------------------------------------------------

/**
 * The first text inside a Lighter's window, with a safe safeguard result,
 * saved as that card's "what helped" through the shared core, never shared.
 * A reflection already written (in the app) is left alone.
 */
export const saveReflection = internalMutation({
	args: {
		cardId: v.id("follow_up_cards"),
		identityId: v.id("channel_identities"),
		text: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!(identity && isLive(identity))) {
			return null;
		}
		const existing = await ctx.db
			.query("follow_up_responses")
			.withIndex("by_card", (q) => q.eq("cardId", args.cardId))
			.first();
		if (existing?.reflectionText) {
			return null;
		}
		await resolveCardCore(ctx, {
			cardId: args.cardId,
			details: {
				...(existing?.heavierChoice && {
					heavierChoice: existing.heavierChoice,
				}),
				reflectionText: args.text.slice(0, REFLECTION_MAX_LENGTH),
				shareRequested: false,
			},
			profileId: identity.emotionalProfileId,
			source: "telegram",
		});
		return null;
	},
	returns: v.null(),
});

/** Add a reply's turns to the chat's recent ones. */
export const rememberTurns = internalMutation({
	args: {
		identityId: v.id("channel_identities"),
		turns: v.array(turnValidator),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!(identity && isLive(identity))) {
			return null;
		}
		const now = Date.now();
		const added = args.turns.map((t) => ({
			at: now,
			role: t.role,
			text: t.text.slice(0, TURN_MAX_CHARS),
		}));
		await ctx.db.patch("channel_identities", identity._id, {
			recentTurns: [...recentTurns(identity, now), ...added].slice(-TURNS_KEPT),
		});
		return null;
	},
	returns: v.null(),
});

// ---------------------------------------------------------------------------
// Replying
// ---------------------------------------------------------------------------

function keyboardOf(buttons: { open: boolean; support: boolean }): Keyboard {
	const rows: Keyboard = [];
	if (buttons.support) {
		rows.push([{ text: SUPPORT_RESOURCES_BUTTON, url: appLink("support") }]);
	}
	if (buttons.open) {
		rows.push([{ text: OPEN_XOLACE_BUTTON, url: appLink("app") }]);
	}
	return rows;
}

/** Send one reply, `protect_content` always. A 403 ends the link. */
async function sendReply(
	ctx: ActionCtx,
	chatId: string,
	text: string,
	keyboard: Keyboard
): Promise<boolean> {
	try {
		await botApi.sendMessage({
			chat_id: chatId,
			protect_content: true,
			text,
			...(keyboard.length > 0 && {
				reply_markup: { inline_keyboard: keyboard },
			}),
		});
		return true;
	} catch (error) {
		if (error instanceof TelegramApiError && error.errorCode === FORBIDDEN) {
			await ctx.runMutation(
				internal.outreach.telegram.lifecycle.markUnreachable,
				{ chatId }
			);
		} else {
			console.error("Telegram reply failed", error);
		}
		return false;
	}
}

/** Shows "typing…" while the reply is written. A lost one is harmless. */
async function typing(chatId: string): Promise<void> {
	try {
		await botApi.sendChatAction({ action: "typing", chat_id: chatId });
	} catch {
		// Nothing to do: the reply still goes.
	}
}

/** The safeguard over a text: what it means for the reply. */
async function screen(text: string) {
	const verdict = await checkWordsSafety(text);
	const safe = verdict.level === "none" || verdict.level === "gentle";
	return {
		// Crisis waits for its own path (#772): the fixed line and resources.
		crisis: verdict.level === "crisis",
		// Only these, with both providers answering, let a text be kept.
		keepable: safe && !verdict.unavailable,
		level: verdict.level,
		// Elevated, or no safeguard at all: resources ride with the reply.
		support: !safe || verdict.unavailable,
	};
}

/**
 * Reply to a claimed tap or text. Runs after the claim commits, so it never
 * throws (a retry would find the update claimed and send nothing): anything
 * that fails before a message went out sends the fixed failure line instead,
 * and nothing is ever sent twice.
 */
export async function respond(ctx: ActionCtx, job: ReplyJob): Promise<void> {
	const progress = { sent: false };
	try {
		await reply(ctx, job, progress);
	} catch (error) {
		console.error("[telegram] reply failed", error);
		if (!progress.sent) {
			await sendFailureLine(ctx, job.chatId);
		}
	}
}

/** The failure line, with Open Xolace when the app link can be made. */
async function sendFailureLine(ctx: ActionCtx, chatId: string): Promise<void> {
	let keyboard: Keyboard = [];
	try {
		keyboard = keyboardOf({ open: true, support: false });
	} catch (error) {
		console.error("[telegram] no app link for the failure line", error);
	}
	await sendReply(ctx, chatId, REPLY_FAILED, keyboard);
}

async function reply(
	ctx: ActionCtx,
	job: ReplyJob,
	progress: { sent: boolean }
): Promise<void> {
	const { chatId, identityId, trigger } = job;
	const send = async (text: string, keyboard: Keyboard) => {
		progress.sent = true;
		return await sendReply(ctx, chatId, text, keyboard);
	};
	await typing(chatId);

	let support = false;
	let open = false;
	let person: string;
	let replyTrigger: ReplyTrigger;
	if (trigger.kind === "tap") {
		person = `Tapped: ${ANSWER_BUTTONS[trigger.answer]}`;
		replyTrigger = { answer: trigger.answer, kind: "tap" };
		// Heavier carries support and the way back to the app.
		support = trigger.answer === "heavier";
		open = support;
	} else {
		const text = trigger.text.slice(0, TEXT_MAX_CHARS);
		const safety = await screen(text);
		if (safety.crisis) {
			await send(
				CRISIS_HOLDING_LINE,
				keyboardOf({ open: true, support: true })
			);
			return;
		}
		if (trigger.reflectionCardId && safety.keepable) {
			await ctx.runMutation(internal.outreach.telegram.reply.saveReflection, {
				cardId: trigger.reflectionCardId,
				identityId,
				text,
			});
		}
		person = text;
		replyTrigger = { kind: "text", level: safety.level, text };
		support = safety.support;
	}

	const context = await ctx.runQuery(
		internal.outreach.telegram.reply.replyContext,
		{
			identityId,
			...(trigger.kind === "tap" && { cardId: trigger.cardId }),
		}
	);
	if (!context) {
		return;
	}
	const written = await writeReply({
		card: context.card,
		memory: context.memory,
		reach: context.reach,
		resources: support,
		trigger: replyTrigger,
		turns: context.turns satisfies ReplyTurn[],
	});
	if (written === null) {
		await send(REPLY_FAILED, keyboardOf({ open: true, support }));
		return;
	}
	const sent = await send(written, keyboardOf({ open, support }));
	if (sent) {
		await ctx.runMutation(internal.outreach.telegram.reply.rememberTurns, {
			identityId,
			turns: [
				{ role: "person", text: person },
				{ role: "xolace", text: written },
			],
		});
	}
}

/** A tap's reflection window: Lighter opens one; any other answer none. */
export const reflectionWindow = (
	answer: TapAnswer,
	cardId: Id<"follow_up_cards">,
	now: number
) =>
	answer === "lighter"
		? { cardId, until: now + REFLECTION_WINDOW_MS }
		: undefined;
