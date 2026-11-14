import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	type ActionCtx,
	internalAction,
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "../../_generated/server";
import { checkWordsSafety } from "../../ai/intake/read";
import type { TalkPeak } from "../../ai/safeguard";
import { writeReply } from "../../ai/telegram/reply";
import type {
	ReplyCard,
	ReplyTrigger,
	ReplyTurn,
	TapAnswer,
} from "../../ai/telegram/replyPrompt";
import { raiseEscalation, sourceEventSince } from "../../escalation/events";
import {
	REFLECTION_MAX_LENGTH,
	resolveCardCore,
} from "../../followUps/resolve";
import {
	type CrisisContacts,
	crisisContactsFor,
	IASP_DIRECTORY_URL,
	type Resource,
} from "../../lib/crisisResources";
import { hasPremium } from "../../lib/premium";
import {
	domainValidator,
	reachValidator,
	triggerTypeValidator,
} from "../../lib/validators";
import { localDayKey } from "../../streaks/activityLog";
import { profileTimezone } from "../../streaks/state";
import { talkPreload } from "../../talk/remember";
import {
	ESCALATION_HOLD_MS,
	escalatedRecently,
	openEscalationCard,
} from "../router";
import {
	type BurstLevel,
	burstLevelValidator,
	pendingBurstValidator,
} from "../validators";
import { appLink } from "./appLinks";
import { botApi, FORBIDDEN, TelegramApiError } from "./botApi";
import { BURST_WAIT_MS, DAILY_REPLY_CAP } from "./caps";
import { cardOf, isCardOpen, type Keyboard, openCheckInsOf } from "./checkIn";
import {
	ANSWER_BUTTONS,
	CAP_REPLY,
	CAP_UPSELL,
	crisisReply,
	FIND_A_HELPLINE_BUTTON,
	GET_PLUS_BUTTON,
	MORE_SUPPORT_BUTTON,
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
 *
 * Caps and bursts (#771): each reply takes one of the day's slots (Plus 50,
 * free 5, on the user's local day), and past the cap gets a fixed line
 * instead. Texts are screened as they arrive, then wait out a burst: one
 * reply, 6 s after the last, answers them all.
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
/** A burst keeps its latest texts, so a flood can't grow the row. */
const BURST_MAX_TEXTS = 10;

const tapAnswerValidator = v.union(
	v.literal("lighter"),
	v.literal("still_here"),
	v.literal("heavier")
);

/** What a claimed update leaves for a reply, decided in its transaction. */
export const replyJobValidator = v.object({
	chatId: v.string(),
	identityId: v.id("channel_identities"),
	/**
	 * The link this reply is for. A relink reuses the chat's row (another
	 * account, even), so the row's id alone can't tell an old link from a new.
	 */
	linkedAt: v.number(),
	trigger: v.union(
		v.object({
			answer: tapAnswerValidator,
			cardId: v.id("follow_up_cards"),
			kind: v.literal("tap"),
		}),
		v.object({
			/** The update it came in on, for a crisis's escalation event (#772). */
			inboundEventId: v.optional(v.id("inbound_events")),
			kind: v.literal("text"),
			/** When the update was claimed: a burst waits from here (#771). */
			receivedAt: v.optional(v.number()),
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
	/** A crisis came in on Telegram in the last 72 h (#772). */
	recentCrisis: v.boolean(),
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

/** The link a reply was claimed for, still live and not relinked since. */
const isLinkOf = (
	identity: Doc<"channel_identities"> | null,
	linkedAt: number
): identity is Doc<"channel_identities"> =>
	identity !== null && isLive(identity) && identity.linkedAt === linkedAt;

/** Whether a reply may still go: its link is live and unchanged. */
export const isCurrentLink = internalQuery({
	args: { identityId: v.id("channel_identities"), linkedAt: v.number() },
	handler: async (ctx, args) =>
		isLinkOf(
			await ctx.db.get("channel_identities", args.identityId),
			args.linkedAt
		),
	returns: v.boolean(),
});

/** A turn is context only while it's recent. */
const recentTurns = (identity: Doc<"channel_identities">, now: number) =>
	(identity.recentTurns ?? []).filter((t) => t.at > now - TURNS_TTL_MS);

/** What a reply knows, or null once the link is no longer live. */
export const replyContext = internalQuery({
	args: {
		cardId: v.optional(v.id("follow_up_cards")),
		identityId: v.id("channel_identities"),
		linkedAt: v.number(),
		/** The action's clock: a query never reads its own. */
		now: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!isLinkOf(identity, args.linkedAt)) {
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
		const { now } = args;
		return {
			card: card ? asReplyCard(card) : null,
			memory: (await talkPreload(ctx, profile, now)).talkMemory,
			reach: prefs?.notifications?.reach ?? "warm",
			recentCrisis:
				(await sourceEventSince(
					ctx,
					profile._id,
					"telegram",
					now - ESCALATION_HOLD_MS
				)) !== null,
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
		linkedAt: v.number(),
		text: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!isLinkOf(identity, args.linkedAt)) {
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
		linkedAt: v.number(),
		turns: v.array(turnValidator),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!isLinkOf(identity, args.linkedAt)) {
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
		// Nothing outlives its day, even if no message ever comes again.
		await ctx.scheduler.runAfter(
			TURNS_TTL_MS,
			internal.outreach.telegram.reply.expireTurns,
			{ identityId: identity._id }
		);
		return null;
	},
	returns: v.null(),
});

/** Drop a chat's turns older than a day. */
export const expireTurns = internalMutation({
	args: { identityId: v.id("channel_identities") },
	handler: async (ctx, { identityId }) => {
		const identity = await ctx.db.get("channel_identities", identityId);
		if (!identity?.recentTurns) {
			return null;
		}
		const kept = recentTurns(identity, Date.now());
		if (kept.length < identity.recentTurns.length) {
			await ctx.db.patch("channel_identities", identityId, {
				recentTurns: kept.length > 0 ? kept : undefined,
			});
		}
		return null;
	},
	returns: v.null(),
});

// ---------------------------------------------------------------------------
// The daily cap (#771)
// ---------------------------------------------------------------------------

/** Which line a reply past the cap gets. */
const capLineValidator = v.union(
	// Plus, not struggling.
	v.literal("plain"),
	// Struggling, on any plan: never sold to.
	v.literal("support"),
	// Free, not struggling.
	v.literal("upsell")
);
type CapLine = Infer<typeof capLineValidator>;

/** What a reply may do: go, or which cap line it gets instead. */
const slotValidator = v.union(
	v.object({ kind: v.literal("reply") }),
	v.object({ kind: v.literal("capped"), line: capLineValidator })
);

/** A Heavier answer counts as struggling this long after it was given. */
const HEAVIER_WINDOW_MS = 72 * 60 * 60 * 1000;

/**
 * Struggling, beyond this turn: the tapped or open card is elevated, acute
 * or escalation-derived; the card in view was answered Heavier in the last
 * 72 h; an escalation-derived card is open; or there was a crisis in the
 * last 72 h. An old card, long closed, says nothing about today.
 */
async function struggling(
	ctx: QueryCtx,
	identity: Doc<"channel_identities">,
	cardId: Id<"follow_up_cards"> | undefined,
	now: number
): Promise<boolean> {
	const profileId = identity.emotionalProfileId;
	const tapped = cardId ? await ctx.db.get("follow_up_cards", cardId) : null;
	const card =
		tapped?.emotionalProfileId === profileId
			? tapped
			: await cardInView(ctx, identity);
	const current = card !== null && (card === tapped || isCardOpen(card));
	if (
		card &&
		((current && (card.tier !== "standard" || card.escalationDerived)) ||
			(card.userResponse === "heavier" &&
				(card.resolvedAt ?? 0) > now - HEAVIER_WINDOW_MS))
	) {
		return true;
	}
	return (
		(await openEscalationCard(ctx, profileId)) !== null ||
		(await escalatedRecently(ctx, profileId, now))
	);
}

/**
 * Take one of today's replies, counted on the user's local day for the
 * account linked now; or, at the cap, say which line goes instead. Null once
 * the link is no longer the one the reply was for.
 */
export const takeReplySlot = internalMutation({
	args: {
		/** The tapped card, when a tap is being answered. */
		cardId: v.optional(v.id("follow_up_cards")),
		/** The safeguard said elevated this turn. */
		elevated: v.boolean(),
		/** This turn is a Heavier tap. */
		heavier: v.boolean(),
		identityId: v.id("channel_identities"),
		linkedAt: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!isLinkOf(identity, args.linkedAt)) {
			return null;
		}
		const profile = await ctx.db.get(
			"emotional_profiles",
			identity.emotionalProfileId
		);
		if (!profile) {
			return null;
		}
		const now = Date.now();
		const day = localDayKey(now, await profileTimezone(ctx, profile));
		const counted = identity.replyCount;
		const used =
			counted?.day === day && counted.emotionalProfileId === profile._id
				? counted.count
				: 0;
		const plus = await hasPremium(ctx, profile);
		if (used < DAILY_REPLY_CAP[plus ? "plus" : "free"]) {
			await ctx.db.patch("channel_identities", identity._id, {
				replyCount: { count: used + 1, day, emotionalProfileId: profile._id },
			});
			return { kind: "reply" as const };
		}
		const isStruggling =
			args.elevated ||
			args.heavier ||
			(await struggling(ctx, identity, args.cardId, now));
		let line: CapLine = "upsell";
		if (isStruggling) {
			line = "support";
		} else if (plus) {
			line = "plain";
		}
		return { kind: "capped" as const, line };
	},
	returns: v.union(v.null(), slotValidator),
});

/** Give back a slot whose reply never went out: a failure isn't a reply. */
export const returnReplySlot = internalMutation({
	args: { identityId: v.id("channel_identities") },
	handler: async (ctx, { identityId }) => {
		const identity = await ctx.db.get("channel_identities", identityId);
		const counted = identity?.replyCount;
		if (identity && counted && counted.count > 0) {
			await ctx.db.patch("channel_identities", identityId, {
				replyCount: { ...counted, count: counted.count - 1 },
			});
		}
		return null;
	},
	returns: v.null(),
});

// ---------------------------------------------------------------------------
// Bursts (#771)
// ---------------------------------------------------------------------------

const worse = (a: BurstLevel, b: BurstLevel): BurstLevel => {
	const order: BurstLevel[] = ["none", "gentle", "elevated"];
	return order.indexOf(a) >= order.indexOf(b) ? a : b;
};

/**
 * Add a screened text to the chat's burst, move its reply to 6 s from now,
 * and schedule that reply. An earlier text's reply finds itself moved and
 * sends nothing; the last one answers the whole burst.
 */
export const queueText = internalMutation({
	args: {
		chatId: v.string(),
		identityId: v.id("channel_identities"),
		level: burstLevelValidator,
		linkedAt: v.number(),
		/** When the text arrived; its screening doesn't add to the wait. */
		receivedAt: v.number(),
		support: v.boolean(),
		text: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!isLinkOf(identity, args.linkedAt)) {
			return null;
		}
		const waiting =
			identity.pendingBurst?.linkedAt === args.linkedAt
				? identity.pendingBurst
				: undefined;
		const dueAt = args.receivedAt + BURST_WAIT_MS;
		await ctx.db.patch("channel_identities", identity._id, {
			pendingBurst: {
				dueAt,
				level: waiting ? worse(waiting.level, args.level) : args.level,
				linkedAt: args.linkedAt,
				support: (waiting?.support ?? false) || args.support,
				texts: [...(waiting?.texts ?? []), args.text].slice(-BURST_MAX_TEXTS),
			},
		});
		await ctx.scheduler.runAt(
			Math.max(dueAt, Date.now()),
			internal.outreach.telegram.reply.answerBurst,
			{
				chatId: args.chatId,
				dueAt,
				identityId: identity._id,
				linkedAt: args.linkedAt,
			}
		);
		return null;
	},
	returns: v.null(),
});

/**
 * Take the burst whose reply is due at `dueAt`, once: null when a later
 * text moved it, it was already taken or dropped, or its link has changed.
 */
export const takeBurst = internalMutation({
	args: {
		dueAt: v.number(),
		identityId: v.id("channel_identities"),
		linkedAt: v.number(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		const burst = identity?.pendingBurst;
		if (!(identity && burst) || burst.dueAt !== args.dueAt) {
			return null;
		}
		await ctx.db.patch("channel_identities", identity._id, {
			pendingBurst: undefined,
		});
		return isLinkOf(identity, args.linkedAt) && burst.linkedAt === args.linkedAt
			? burst
			: null;
	},
	returns: v.union(v.null(), pendingBurstValidator),
});

/** The one reply to a burst, once it has waited 6 s after its last text. */
export const answerBurst = internalAction({
	args: {
		chatId: v.string(),
		dueAt: v.number(),
		identityId: v.id("channel_identities"),
		linkedAt: v.number(),
	},
	handler: async (ctx, args) => {
		const burst = await ctx.runMutation(
			internal.outreach.telegram.reply.takeBurst,
			{
				dueAt: args.dueAt,
				identityId: args.identityId,
				linkedAt: args.linkedAt,
			}
		);
		if (!burst) {
			return null;
		}
		const text = burst.texts.join("\n").slice(0, TEXT_MAX_CHARS);
		const job: ReplyJob = {
			chatId: args.chatId,
			identityId: args.identityId,
			linkedAt: args.linkedAt,
			trigger: { kind: "text", text },
		};
		const progress: Progress = { sent: false, support: burst.support };
		await guarded(ctx, job, progress, async () => {
			await typing(args.chatId);
			await writeAndSend(ctx, job, progress, {
				elevated: burst.level === "elevated",
				heavier: false,
				open: false,
				person: text,
				support: burst.support,
				trigger: { kind: "text", level: burst.level, text },
			});
		});
		return null;
	},
	returns: v.null(),
});

// ---------------------------------------------------------------------------
// Crisis (#772)
// ---------------------------------------------------------------------------

/** What the safeguard said raised the crisis: categories only, never words. */
const crisisTriggerValidator = v.object({
	triggerConfidence: v.number(),
	triggerEvidence: v.string(),
	triggerType: triggerTypeValidator,
});

/** A crisis verdict that came without its trigger still escalates. */
const UNKNOWN_TRIGGER = {
	triggerConfidence: 0,
	triggerEvidence: "Safeguard crisis verdict without a named trigger.",
	triggerType: "implicit_risk_language",
} as const;

const crisisTriggerOf = (peak: TalkPeak | undefined) =>
	peak
		? {
				triggerConfidence: peak.triggerConfidence,
				triggerEvidence: peak.triggerEvidence,
				triggerType: peak.triggerType,
			}
		: UNKNOWN_TRIGGER;

/** What the crisis reply names, as the event records it. */
function presented(contacts: CrisisContacts | null): Resource[] {
	if (!contacts) {
		return [
			{
				label: FIND_A_HELPLINE_BUTTON,
				priority: 1,
				source: "online_resource",
				type: "url",
				value: IASP_DIRECTORY_URL,
			},
		];
	}
	return [
		{
			label: "Emergency number",
			priority: 1,
			source: "crisis_line",
			type: "phone",
			value: contacts.emergencyNumber,
		},
		...contacts.helplines,
	];
}

/**
 * A crisis text, in one transaction: end any waiting burst, mark an open
 * card escalation-derived, and write the escalation event (one per open
 * card, else one per day), which starts the router's 72 h hold. Returns the
 * chat's country for the reply, or null once the link is no longer the one
 * the text came in on.
 */
export const recordCrisis = internalMutation({
	args: {
		identityId: v.id("channel_identities"),
		inboundEventId: v.optional(v.id("inbound_events")),
		linkedAt: v.number(),
		trigger: crisisTriggerValidator,
	},
	handler: async (ctx, args) => {
		const identity = await ctx.db.get("channel_identities", args.identityId);
		if (!isLinkOf(identity, args.linkedAt)) {
			return null;
		}
		if (identity.pendingBurst) {
			await ctx.db.patch("channel_identities", identity._id, {
				pendingBurst: undefined,
			});
		}
		const card = await cardInView(ctx, identity);
		const openCard =
			isCardOpen(card) &&
			card?.emotionalProfileId === identity.emotionalProfileId
				? card
				: null;
		if (openCard && !openCard.escalationDerived) {
			await ctx.db.patch("follow_up_cards", openCard._id, {
				escalationDerived: true,
			});
		}
		await raiseEscalation(ctx, {
			actionTaken: "crisis_line_presented",
			emotionalProfileId: identity.emotionalProfileId,
			resourcesPresented: presented(crisisContactsFor(identity.country)),
			source: "telegram",
			...args.trigger,
			...(args.inboundEventId && { inboundEventId: args.inboundEventId }),
			...(openCard && { followUpCardId: openCard._id }),
		});
		return { country: identity.country ?? null };
	},
	returns: v.union(
		v.null(),
		v.object({ country: v.union(v.null(), v.string()) })
	),
});

/**
 * The crisis reply's buttons: IASP's directory first when the country is
 * unknown, then the app's crisis screen and Open Xolace.
 */
const crisisKeyboard = (contacts: CrisisContacts | null): Keyboard => [
	...(contacts
		? []
		: [[{ text: FIND_A_HELPLINE_BUTTON, url: IASP_DIRECTORY_URL }]]),
	[{ text: MORE_SUPPORT_BUTTON, url: appLink("support") }],
	[{ text: OPEN_XOLACE_BUTTON, url: appLink("app") }],
];

/**
 * Answer a crisis text at once with the fixed reply, never the model. The
 * reply goes even if recording the crisis fails: the person comes first.
 */
async function answerCrisis(
	ctx: ActionCtx,
	job: ReplyJob,
	trigger: Extract<ReplyJob["trigger"], { kind: "text" }>,
	peak: TalkPeak | undefined
): Promise<void> {
	let country: string | null = null;
	try {
		const recorded = await ctx.runMutation(
			internal.outreach.telegram.reply.recordCrisis,
			{
				identityId: job.identityId,
				linkedAt: job.linkedAt,
				trigger: crisisTriggerOf(peak),
				...(trigger.inboundEventId && {
					inboundEventId: trigger.inboundEventId,
				}),
			}
		);
		if (!recorded) {
			return;
		}
		country = recorded.country;
	} catch (error) {
		console.error("[telegram] recording a crisis failed", error);
	}
	const contacts = crisisContactsFor(country);
	await sendReply(ctx, job, crisisReply(contacts), crisisKeyboard(contacts));
}

// ---------------------------------------------------------------------------
// Replying
// ---------------------------------------------------------------------------

function keyboardOf(buttons: {
	open: boolean;
	plus?: boolean;
	support: boolean;
}): Keyboard {
	const rows: Keyboard = [];
	if (buttons.plus) {
		rows.push([{ text: GET_PLUS_BUTTON, url: appLink("plus") }]);
	}
	if (buttons.support) {
		rows.push([{ text: SUPPORT_RESOURCES_BUTTON, url: appLink("support") }]);
	}
	if (buttons.open) {
		rows.push([{ text: OPEN_XOLACE_BUTTON, url: appLink("app") }]);
	}
	return rows;
}

/**
 * Send one reply, `protect_content` always, and only while the link it was
 * claimed for is live and unchanged: a `/stop`, a block or a relink to
 * another account can land while the model writes. A 403 ends that link.
 */
async function sendReply(
	ctx: ActionCtx,
	job: ReplyJob,
	text: string,
	keyboard: Keyboard
): Promise<boolean> {
	const { chatId, identityId, linkedAt } = job;
	const current = await ctx.runQuery(
		internal.outreach.telegram.reply.isCurrentLink,
		{ identityId, linkedAt }
	);
	if (!current) {
		return false;
	}
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
				{ chatId, linkedAt }
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
		// Only these, with both providers answering, let a text be kept.
		keepable: safe && !verdict.unavailable,
		level: verdict.level,
		peak: verdict.peak,
		// Elevated, or no safeguard at all: resources ride with the reply.
		support: !safe || verdict.unavailable,
	};
}

/**
 * Handle a claimed tap or text. Runs after the claim commits, so it never
 * throws (a retry would find the update claimed and send nothing): anything
 * that fails before a message went out sends the fixed failure line instead,
 * and nothing is ever sent twice. A tap is answered now; a text is screened
 * now and joins the chat's burst, answered once it settles.
 */
export async function respond(ctx: ActionCtx, job: ReplyJob): Promise<void> {
	const progress: Progress = { sent: false, support: false };
	const { trigger } = job;
	await guarded(ctx, job, progress, () =>
		trigger.kind === "tap"
			? replyToTap(ctx, job, trigger, progress)
			: receiveText(ctx, job, trigger, progress)
	);
}

/**
 * How far a reply got: whether a message went out (or the text was handed
 * to its burst), and whether Support resources are already owed (Heavier,
 * elevated, no safeguard).
 */
type Progress = { sent: boolean; support: boolean };

/** Run `work`; if it throws before anything went out, send the failure line. */
async function guarded(
	ctx: ActionCtx,
	job: ReplyJob,
	progress: Progress,
	work: () => Promise<void>
): Promise<void> {
	try {
		await work();
	} catch (error) {
		console.error("[telegram] reply failed", error);
		if (!progress.sent) {
			await sendFailureLine(ctx, job, progress.support);
		}
	}
}

/**
 * The failure line, with Open Xolace when the app link can be made, and
 * Support resources when the reply owed them.
 */
async function sendFailureLine(
	ctx: ActionCtx,
	job: ReplyJob,
	support: boolean
): Promise<void> {
	let keyboard: Keyboard = [];
	try {
		keyboard = keyboardOf({ open: true, support });
	} catch (error) {
		console.error("[telegram] no app link for the failure line", error);
	}
	await sendReply(ctx, job, REPLY_FAILED, keyboard);
}

async function replyToTap(
	ctx: ActionCtx,
	job: ReplyJob,
	trigger: Extract<ReplyJob["trigger"], { kind: "tap" }>,
	progress: Progress
): Promise<void> {
	await typing(job.chatId);
	// Heavier carries support and the way back to the app.
	const heavier = trigger.answer === "heavier";
	progress.support = heavier;
	await writeAndSend(ctx, job, progress, {
		cardId: trigger.cardId,
		elevated: false,
		heavier,
		open: heavier,
		person: `Tapped: ${ANSWER_BUTTONS[trigger.answer]}`,
		support: heavier,
		trigger: { answer: trigger.answer, kind: "tap" },
	});
}

/**
 * A text, on arrival: screened whole (only what is kept or shown is cut). A
 * crisis is answered at once and ends any burst; anything else may be kept
 * as what helped, then joins the burst.
 */
async function receiveText(
	ctx: ActionCtx,
	job: ReplyJob,
	trigger: Extract<ReplyJob["trigger"], { kind: "text" }>,
	progress: Progress
): Promise<void> {
	const { chatId, identityId, linkedAt } = job;
	await typing(chatId);
	const safety = await screen(trigger.text);
	progress.support = safety.support;
	// Crisis has its own path (#772): the fixed reply, never the model.
	if (safety.level === "crisis") {
		progress.sent = true;
		await answerCrisis(ctx, job, trigger, safety.peak);
		return;
	}
	const text = trigger.text.slice(0, TEXT_MAX_CHARS);
	if (trigger.reflectionCardId && safety.keepable) {
		await ctx.runMutation(internal.outreach.telegram.reply.saveReflection, {
			cardId: trigger.reflectionCardId,
			identityId,
			linkedAt,
			text,
		});
	}
	await ctx.runMutation(internal.outreach.telegram.reply.queueText, {
		chatId,
		identityId,
		level: safety.level,
		linkedAt,
		receivedAt: trigger.receivedAt ?? Date.now(),
		support: safety.support,
		text,
	});
	// The burst's reply owns failures from here.
	progress.sent = true;
}

/** One turn to answer: what the model hears, and what rides with it. */
type Turn = {
	cardId?: Id<"follow_up_cards">;
	elevated: boolean;
	heavier: boolean;
	open: boolean;
	person: string;
	support: boolean;
	trigger: ReplyTrigger;
};

/** The cap line a capped reply gets, and its buttons. */
function capLine(line: CapLine) {
	return {
		keyboard: keyboardOf({
			open: true,
			plus: line === "upsell",
			support: line === "support",
		}),
		text: line === "upsell" ? CAP_UPSELL : CAP_REPLY,
	};
}

/** Take a slot, then write and send the reply, or the cap line past the cap. */
async function writeAndSend(
	ctx: ActionCtx,
	job: ReplyJob,
	progress: Progress,
	turn: Turn
): Promise<void> {
	const { identityId, linkedAt } = job;
	const send = async (text: string, keyboard: Keyboard) => {
		progress.sent = true;
		return await sendReply(ctx, job, text, keyboard);
	};
	const slot = await ctx.runMutation(
		internal.outreach.telegram.reply.takeReplySlot,
		{
			elevated: turn.elevated,
			heavier: turn.heavier,
			identityId,
			linkedAt,
			...(turn.cardId && { cardId: turn.cardId }),
		}
	);
	if (!slot) {
		return;
	}
	if (slot.kind === "capped") {
		const { keyboard, text } = capLine(slot.line);
		await send(text, keyboard);
		return;
	}

	const context = await ctx.runQuery(
		internal.outreach.telegram.reply.replyContext,
		{
			identityId,
			linkedAt,
			now: Date.now(),
			...(turn.cardId && { cardId: turn.cardId }),
		}
	);
	const giveBack = () =>
		ctx.runMutation(internal.outreach.telegram.reply.returnReplySlot, {
			identityId,
		});
	if (!context) {
		await giveBack();
		return;
	}
	const { open, support } = turn;
	const written = await writeReply({
		card: context.card,
		memory: context.memory,
		reach: context.reach,
		recentCrisis: context.recentCrisis,
		resources: support,
		trigger: turn.trigger,
		turns: context.turns satisfies ReplyTurn[],
	});
	if (written === null) {
		await giveBack();
		await send(REPLY_FAILED, keyboardOf({ open: true, support }));
		return;
	}
	const sent = await send(written, keyboardOf({ open, support }));
	if (sent) {
		await ctx.runMutation(internal.outreach.telegram.reply.rememberTurns, {
			identityId,
			linkedAt,
			turns: [
				{ role: "person", text: turn.person },
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
