import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { hasPremium } from "../lib/premium";
import { rateLimiter } from "../lib/rateLimits";
import { ADAPTERS } from "./adapters";
import {
	achievementToggle,
	channelConfig,
	channelTakesIntent,
	DEFAULT_CHANNEL_ORDER,
} from "./channels";
import { telegramConfigured } from "./telegram/bot";
import { identitiesOf } from "./telegram/lifecycle";
import type {
	FollowUpTier,
	IneligibilityReason,
	OutreachChannel,
	OutreachIntent,
	SuppressedReason,
} from "./validators";

/**
 * The outreach router's gates (#760, #728). `enqueue` runs them in the
 * spec's order; the delivery runner reuses the channel walk for its one
 * fallback. Callers never gate themselves.
 */

const HOUR = 3_600_000;
/** An escalation event holds every routine outreach this long. */
export const ESCALATION_HOLD_MS = 72 * HOUR;

/** 30 days with no session: the dormancy hold (docs/paths-v1.md §10). */
export const INACTIVE_THRESHOLD_MS = 30 * 24 * HOUR;

/** Statuses a follow-up card is still open in. Superseded stays visible. */
const UNRESOLVED_CARD_STATUSES = [
	"pending",
	"ready",
	"shown",
	"superseded",
] as const;

/** Intents a 30-day silence suppresses. */
const DORMANCY_INTENTS: ReadonlySet<OutreachIntent> = new Set([
	"gentle_return",
	"pattern_nudge",
	"kindling_ready",
]);

type Notifications = Doc<"preferences">["notifications"];

export type RouteInput = {
	emotionalProfileId: Id<"emotional_profiles">;
	followUpId?: Id<"follow_up_cards">;
	intent: OutreachIntent;
	tier?: FollowUpTier;
};

/** Gate 2: the account is deleted or being purged. */
export async function accountDeleted(
	ctx: QueryCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<boolean> {
	const user = await ctx.db
		.query("users")
		.withIndex("by_emotional_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.first();
	return (
		!user ||
		user.accountStatus === "deleted" ||
		user.accountStatus === "purging"
	);
}

/**
 * Gate 3: escalation and dormancy.
 *
 * An open escalation-derived card holds every intent except that card's own
 * nudge, and the nudge is exempt from the 72 h hold too: the crisis that
 * raised the event is what the nudge checks in on.
 */
export async function escalationOrDormancy(
	ctx: QueryCtx,
	input: RouteInput,
	profile: Doc<"emotional_profiles">,
	now: number
): Promise<SuppressedReason | null> {
	// Dormancy first: it needs no reads, and either hold suppresses.
	if (
		DORMANCY_INTENTS.has(input.intent) &&
		profile.lastSessionAt !== undefined &&
		now - profile.lastSessionAt > INACTIVE_THRESHOLD_MS
	) {
		return "user_inactive";
	}

	// An escalation-derived card's own nudge passes both holds.
	const nudgedCard =
		input.intent === "nudge" && input.followUpId !== undefined
			? await ctx.db.get("follow_up_cards", input.followUpId)
			: null;
	const ownCardNudge =
		nudgedCard?.escalationDerived === true &&
		(UNRESOLVED_CARD_STATUSES as readonly string[]).includes(nudgedCard.status);

	if (!ownCardNudge) {
		for (const status of UNRESOLVED_CARD_STATUSES) {
			const openEscalationCard = await ctx.db
				.query("follow_up_cards")
				.withIndex("by_profile_escalation_status", (q) =>
					q
						.eq("emotionalProfileId", input.emotionalProfileId)
						.eq("escalationDerived", true)
						.eq("status", status)
				)
				.first();
			if (openEscalationCard) {
				return "escalation_active";
			}
		}
		const recentEscalation = await ctx.db
			.query("escalation_events")
			.withIndex("by_profile", (q) =>
				q
					.eq("emotionalProfileId", input.emotionalProfileId)
					.gte("createdAt", now - ESCALATION_HOLD_MS)
			)
			.first();
		if (recentEscalation) {
			return "escalation_active";
		}
	}

	return null;
}

/** Gate 4: the per-intent toggle, the same on every channel. */
export function intentAllowed(
	intent: OutreachIntent,
	notifications: Notifications | undefined
): boolean {
	if (!notifications) {
		// No preferences row: nothing was ever opted into. Kindling has no
		// toggle of its own; push's global switch still decides for it.
		return intent === "kindling_ready";
	}
	switch (intent) {
		case "nudge":
		case "gentle_return":
			return notifications.gentleReturn;
		case "pattern_nudge":
			return notifications.patternNudge;
		case "milestone":
		case "domain_unlock":
			return notifications.milestone;
		case "achievement":
			return achievementToggle(notifications);
		case "kindling_ready":
			return true;
		default:
			return false;
	}
}

/**
 * Gate 5's buckets, moved unchanged from `notifications.schedule` (#764).
 * Intents with a bucket of their own; the rest share `notification`. Counted
 * across channels.
 */
export function typeBucket(
	intent: OutreachIntent,
	tier: FollowUpTier | undefined
) {
	switch (intent) {
		case "nudge":
			return tier === "acute" ? "followUpAcute" : "followUpNudge";
		case "achievement":
			return "achievement";
		case "domain_unlock":
			return "domainUnlock";
		case "kindling_ready":
			return "kindlingReady";
		default:
			return "notification";
	}
}

export async function consumeTypeBucket(
	ctx: MutationCtx,
	input: RouteInput
): Promise<boolean> {
	const { ok } = await rateLimiter.limit(
		ctx,
		typeBucket(input.intent, input.tier),
		{ key: input.emotionalProfileId }
	);
	return ok;
}

export function isAcuteNudge(input: Pick<RouteInput, "intent" | "tier">) {
	return input.intent === "nudge" && input.tier === "acute";
}

/**
 * The kill switch and the plan: why a channel is closed to this person, or
 * null when it's open. Shared by routing, linking and `listChannels`.
 */
export async function channelClosed(
	ctx: QueryCtx,
	channel: OutreachChannel,
	profile: Doc<"emotional_profiles">
): Promise<"disabled" | "requires_plus" | null> {
	const config = await channelConfig(ctx, channel);
	if (!config.enabled) {
		return "disabled";
	}
	if (config.plan === "plus" && !(await hasPremium(ctx, profile))) {
		return "requires_plus";
	}
	return null;
}

/**
 * Why a person can't link or use a channel on this deployment, or null.
 * `not_configured` here means the deployment has no bot, so Telegram isn't
 * offered at all; whether a delivery adapter exists is routing's question.
 */
export async function channelUnavailable(
	ctx: QueryCtx,
	channel: OutreachChannel,
	profile: Doc<"emotional_profiles">
): Promise<"not_configured" | "disabled" | "requires_plus" | null> {
	if (channel === "telegram" && !(await telegramConfigured(ctx))) {
		return "not_configured";
	}
	return await channelClosed(ctx, channel, profile);
}

/**
 * Whether a channel can take this outreach, bucket aside. Null = eligible.
 */
export async function channelIneligibility(
	ctx: QueryCtx,
	channel: OutreachChannel,
	input: RouteInput,
	profile: Doc<"emotional_profiles">,
	notifications: Notifications | undefined
): Promise<IneligibilityReason | null> {
	if (!channelTakesIntent(channel, input.intent)) {
		return "intent_not_allowed";
	}
	const adapter = ADAPTERS[channel];
	if (!(adapter && (await adapter.configured(ctx)))) {
		return "not_configured";
	}
	const closed = await channelClosed(ctx, channel, profile);
	if (closed) {
		return closed;
	}

	if (channel === "push") {
		// The global switch is push's alone (#760). A profile with no device
		// rows still reaches the pre-registry profile-keyed recipient
		// (`sendPushToProfile`), so `no_device` isn't decided here while that
		// fallback lives.
		return notifications?.enabled ? null : "push_off";
	}

	const identities = await identitiesOf(ctx, input.emotionalProfileId, channel);
	if (identities.some((identity) => identity.status === "active")) {
		return null;
	}
	if (identities.some((identity) => identity.status === "paused")) {
		return "paused";
	}
	// Never linked reads as revoked: there is no active link either way.
	return "revoked";
}

/** Consume the channel's own bucket. Only Telegram has one. */
async function consumeChannelBucket(
	ctx: MutationCtx,
	channel: OutreachChannel,
	input: RouteInput
): Promise<boolean> {
	if (channel !== "telegram") {
		return true;
	}
	const { ok } = await rateLimiter.limit(ctx, "outreachTelegram", {
		key: input.emotionalProfileId,
	});
	// An acute nudge counts toward the day but is never blocked.
	return ok || isAcuteNudge(input);
}

/**
 * Gate 7: walk the person's channel order and take the first eligible
 * channel, consuming its bucket. `exclude` skips channels already tried (the
 * fallback).
 */
export async function pickChannel(
	ctx: MutationCtx,
	input: RouteInput,
	profile: Doc<"emotional_profiles">,
	notifications: Notifications | undefined,
	exclude: readonly OutreachChannel[] = []
): Promise<OutreachChannel | null> {
	const order = notifications?.channelOrder ?? DEFAULT_CHANNEL_ORDER;
	const seen = new Set<OutreachChannel>(exclude);
	for (const channel of order) {
		if (seen.has(channel)) {
			continue;
		}
		seen.add(channel);
		const reason = await channelIneligibility(
			ctx,
			channel,
			input,
			profile,
			notifications
		);
		if (reason === null && (await consumeChannelBucket(ctx, channel, input))) {
			return channel;
		}
	}
	return null;
}

export async function loadNotifications(
	ctx: QueryCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<Notifications | undefined> {
	const prefs = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.unique();
	return prefs?.notifications;
}

/**
 * Gates 2–4, read-only: the account, escalation and dormancy, the per-intent
 * toggle. Either the reason they hold, or what the later gates need.
 */
export async function personGates(
	ctx: QueryCtx,
	input: RouteInput,
	now: number
): Promise<
	| { held: SuppressedReason }
	| {
			held: null;
			notifications: Notifications | undefined;
			profile: Doc<"emotional_profiles">;
	  }
> {
	const profile = await ctx.db.get(
		"emotional_profiles",
		input.emotionalProfileId
	);
	if (!profile || (await accountDeleted(ctx, input.emotionalProfileId))) {
		return { held: "account_deleted" };
	}
	const held = await escalationOrDormancy(ctx, input, profile, now);
	if (held) {
		return { held };
	}
	const notifications = await loadNotifications(ctx, input.emotionalProfileId);
	if (!intentAllowed(input.intent, notifications)) {
		return { held: "toggle_off" };
	}
	return { held: null, notifications, profile };
}

/**
 * Why `enqueue` would suppress this outreach now, or null if it would go
 * out: gates 2–4 and the channel walk, read-only. For a caller that pays
 * before it enqueues (the crons write copy with a model call) to skip work
 * the layer would drop. Buckets and the quiet window are left to `enqueue`:
 * a bucket can't be read without spending it, and the quiet window defers
 * rather than drops.
 */
export async function suppressionFor(
	ctx: QueryCtx,
	input: RouteInput,
	now: number
): Promise<SuppressedReason | null> {
	const gates = await personGates(ctx, input, now);
	if (gates.held) {
		return gates.held;
	}
	const order = gates.notifications?.channelOrder ?? DEFAULT_CHANNEL_ORDER;
	for (const channel of order) {
		const reason = await channelIneligibility(
			ctx,
			channel,
			input,
			gates.profile,
			gates.notifications
		);
		if (reason === null) {
			return null;
		}
	}
	return "no_channel";
}
