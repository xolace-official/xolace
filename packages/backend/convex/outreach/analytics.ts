import type { Infer } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type {
	ResolveSource,
	userResponseValidator,
} from "../followUps/resolve";
import { hasPremium } from "../lib/premium";
import { posthog } from "../posthog";
import type { WebhookDrift } from "./telegram/bot";
import type {
	ChannelErrorKind,
	FollowUpTier,
	inboundKindValidator,
	linkSourceValidator,
	OutreachChannel,
	OutreachIntent,
	revokedReasonValidator,
	SuppressedReason,
} from "./validators";

/**
 * Usage analytics for outreach channels (#774): the one way outreach talks
 * to PostHog. `distinctId` is the emotional profile id; an event about no
 * person (a stranger's text, the webhook drift) goes personless.
 *
 * Never sent: any text a person wrote or was sent, safeguard results,
 * domains, Telegram ids or usernames, tokens, raw errors, outreach or
 * follow-up ids. A crisis stays out of PostHog entirely. Each event's keys
 * are allowlisted below, and anything else is dropped before it leaves.
 */

type Plan = "free" | "plus";
type RevokedReason = Infer<typeof revokedReasonValidator>;

type OutreachEvents = {
	channel_linked: {
		$set: { telegram_linked: true };
		channel: OutreachChannel;
		plan: Plan;
		relink: boolean;
		source: LinkSource;
	};
	channel_unlinked: {
		/** Left out when the account still has another live link. */
		$set?: { telegram_linked: false };
		channel: OutreachChannel;
		days_linked: number;
		reason: RevokedReason;
	};
	follow_up_resolved: {
		escalation_derived: boolean;
		nudge_channel: OutreachChannel | "none";
		plan: Plan;
		response: Infer<typeof userResponseValidator>;
		surface: ResolveSource;
		tier: FollowUpTier;
	};
	outreach_delivery: {
		channel: OutreachChannel;
		error_kind?: ChannelErrorKind;
		intent: OutreachIntent;
		is_fallback: boolean;
		status: "delivered" | "failed";
	};
	outreach_routed: {
		channel?: OutreachChannel;
		intent: OutreachIntent;
		outcome: "routed" | "deferred" | "suppressed" | "no_channel";
		suppressed_by?: "escalation" | "dormancy" | "rate_limit";
		tier?: FollowUpTier;
	};
	telegram_inbound: {
		kind: Infer<typeof inboundKindValidator>;
		outcome: "ai_reply" | "cap_reached" | "stale_card" | "stranger";
		/** Left out for a stranger, who has no account. */
		plan?: Plan;
	};
	telegram_webhook_drift: {
		pending_update_count: number;
		problems: WebhookDrift[];
	};
};
export type OutreachEvent = keyof OutreachEvents;

/** Where a link was started in the app. */
type LinkSource = Infer<typeof linkSourceValidator>;

/** PostHog's flag for an event that belongs to no person. */
const PERSONLESS = "$process_person_profile";

/**
 * Every key each event may carry. The `satisfies` keeps it in step with the
 * types above: a key added there and not here fails to compile.
 */
export const OUTREACH_EVENT_KEYS = {
	channel_linked: ["$set", "channel", "plan", "relink", "source"],
	channel_unlinked: ["$set", "channel", "days_linked", "reason"],
	follow_up_resolved: [
		"escalation_derived",
		"nudge_channel",
		"plan",
		"response",
		"surface",
		"tier",
	],
	outreach_delivery: [
		"channel",
		"error_kind",
		"intent",
		"is_fallback",
		"status",
	],
	outreach_routed: ["channel", "intent", "outcome", "suppressed_by", "tier"],
	telegram_inbound: [PERSONLESS, "kind", "outcome", "plan"],
	telegram_webhook_drift: [PERSONLESS, "pending_update_count", "problems"],
} as const satisfies {
	[E in OutreachEvent]: readonly (
		| keyof OutreachEvents[E]
		| typeof PERSONLESS
	)[];
};

/** Who an event is about: a profile, or no person at all. */
type Subject = Id<"emotional_profiles"> | "telegram_stranger" | "xolace_server";

type SchedulerCtx = Parameters<typeof posthog.capture>[0];

/**
 * Send one outreach event. `properties` may be a function, so reading what
 * an event needs (the plan, say) fails with the event, never with the
 * transaction it rides in: analytics never rolls back what it measures.
 */
export async function captureOutreach<E extends OutreachEvent>(
	ctx: SchedulerCtx,
	event: E,
	subject: Subject,
	properties: OutreachEvents[E] | (() => Promise<OutreachEvents[E]>)
): Promise<void> {
	try {
		const given =
			typeof properties === "function" ? await properties() : properties;
		const allowed: readonly string[] = OUTREACH_EVENT_KEYS[event];
		const kept: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(given)) {
			if (value !== undefined && allowed.includes(key)) {
				kept[key] = value;
			}
		}
		if (subject === "telegram_stranger" || subject === "xolace_server") {
			kept[PERSONLESS] = false;
		}
		await posthog.capture(ctx, {
			distinctId: subject,
			event,
			properties: kept,
		});
	} catch (error) {
		console.error(`[outreach] ${event} capture failed`, error);
	}
}

/** The person's plan, as analytics names it. */
export async function planOf(
	ctx: QueryCtx | MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<Plan> {
	const profile = await ctx.db.get("emotional_profiles", emotionalProfileId);
	return profile && (await hasPremium(ctx, profile)) ? "plus" : "free";
}

/** What routing's suppression reasons look like on the dashboard. */
const SUPPRESSED_BY: Partial<
	Record<SuppressedReason, OutreachEvents["outreach_routed"]["suppressed_by"]>
> = {
	escalation_active: "escalation",
	rate_limit: "rate_limit",
	user_inactive: "dormancy",
};

/**
 * `outreach_routed` for one `enqueue` outcome. An account being deleted
 * sends nothing: it is no longer anyone to measure.
 */
export async function captureRouted(
	ctx: MutationCtx,
	input: {
		emotionalProfileId: Id<"emotional_profiles">;
		intent: OutreachIntent;
		tier?: FollowUpTier;
	},
	outcome:
		| { kind: "suppressed"; reason: SuppressedReason }
		| { channel: OutreachChannel; kind: "queued"; deferred: boolean }
): Promise<void> {
	const base = {
		intent: input.intent,
		...(input.tier && { tier: input.tier }),
	};
	if (outcome.kind === "queued") {
		await captureOutreach(ctx, "outreach_routed", input.emotionalProfileId, {
			...base,
			channel: outcome.channel,
			outcome: outcome.deferred ? "deferred" : "routed",
		});
		return;
	}
	if (outcome.reason === "account_deleted") {
		return;
	}
	await captureOutreach(ctx, "outreach_routed", input.emotionalProfileId, {
		...base,
		outcome: outcome.reason === "no_channel" ? "no_channel" : "suppressed",
		suppressed_by: SUPPRESSED_BY[outcome.reason],
	});
}

/** `outreach_delivery` for a delivery that landed or failed for good. */
export async function captureDelivery(
	ctx: MutationCtx,
	delivery: Doc<"outreach_deliveries">,
	result: { status: "delivered" } | { kind: ChannelErrorKind; status: "failed" }
): Promise<void> {
	const outreach = await ctx.db.get("outreach", delivery.outreachId);
	if (!outreach) {
		return;
	}
	await captureOutreach(ctx, "outreach_delivery", outreach.emotionalProfileId, {
		channel: delivery.channel,
		intent: outreach.intent,
		is_fallback: delivery.isFallback,
		status: result.status,
		...(result.status === "failed" && { error_kind: result.kind }),
	});
}

/** An outreach has one delivery, plus at most one fallback. */
const MAX_DELIVERIES_PER_OUTREACH = 10;
/** A card is nudged a handful of times at most. */
const MAX_NUDGES_PER_CARD = 20;

/** The channel the card's latest delivered nudge landed on, if any did. */
async function nudgeChannelOf(
	ctx: QueryCtx,
	cardId: Id<"follow_up_cards">
): Promise<OutreachChannel | "none"> {
	const nudges = await ctx.db
		.query("outreach")
		.withIndex("by_follow_up", (q) => q.eq("followUpId", cardId))
		.take(MAX_NUDGES_PER_CARD);
	let latest: { at: number; channel: OutreachChannel } | null = null;
	for (const outreach of nudges) {
		if (outreach.intent !== "nudge") {
			continue;
		}
		const deliveries = await ctx.db
			.query("outreach_deliveries")
			.withIndex("by_outreach", (q) => q.eq("outreachId", outreach._id))
			.take(MAX_DELIVERIES_PER_OUTREACH);
		for (const { channel, sentAt, status } of deliveries) {
			if (
				status === "sent" &&
				sentAt !== undefined &&
				(latest === null || sentAt > latest.at)
			) {
				latest = { at: sentAt, channel };
			}
		}
	}
	return latest?.channel ?? "none";
}

/** `follow_up_resolved` for a card that just got its response. */
export async function captureResolved(
	ctx: MutationCtx,
	card: Doc<"follow_up_cards">,
	response: Infer<typeof userResponseValidator>,
	surface: ResolveSource
): Promise<void> {
	await captureOutreach(
		ctx,
		"follow_up_resolved",
		card.emotionalProfileId,
		async () => ({
			escalation_derived: card.escalationDerived,
			nudge_channel: await nudgeChannelOf(ctx, card._id),
			plan: await planOf(ctx, card.emotionalProfileId),
			response,
			surface,
			tier: card.tier,
		})
	);
}

const DAY_MS = 24 * 3_600_000;

/** `channel_unlinked` for a link that just ended. */
export async function captureUnlinked(
	ctx: MutationCtx,
	identity: Doc<"channel_identities">,
	reason: RevokedReason,
	stillLinked: boolean
): Promise<void> {
	// A deleted account is no longer anyone to measure.
	if (reason === "account_deleted") {
		return;
	}
	await captureOutreach(ctx, "channel_unlinked", identity.emotionalProfileId, {
		channel: identity.channel,
		days_linked: Math.floor((Date.now() - identity.linkedAt) / DAY_MS),
		reason,
		...(!stillLinked && { $set: { telegram_linked: false as const } }),
	});
}
