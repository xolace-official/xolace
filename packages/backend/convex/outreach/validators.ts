import { type Infer, v } from "convex/values";

/**
 * The outreach layer's literal unions (#760, #763). One place, so the schema,
 * `enqueue`, the adapters and (later) `listChannels`, admin and analytics all
 * name the same things.
 */

/** Why Xolace is reaching out. `affirmation` is provenance, not an intent. */
export const outreachIntentValidator = v.union(
	v.literal("nudge"), // was `follow_up`
	v.literal("gentle_return"),
	v.literal("pattern_nudge"),
	v.literal("milestone"),
	v.literal("kindling_ready"),
	v.literal("domain_unlock"),
	v.literal("achievement")
);
export type OutreachIntent = Infer<typeof outreachIntentValidator>;

/** A place outreach can land. */
export const outreachChannelValidator = v.union(
	v.literal("push"),
	v.literal("telegram")
);
export type OutreachChannel = Infer<typeof outreachChannelValidator>;

export const followUpTierValidator = v.union(
	v.literal("acute"),
	v.literal("elevated"),
	v.literal("standard")
);
export type FollowUpTier = Infer<typeof followUpTierValidator>;

export const outreachOutcomeValidator = v.union(
	v.literal("queued"),
	v.literal("suppressed")
);

/** Why an outreach went nowhere. `escalation_active` also covers the 72 h crisis hold. */
export const suppressedReasonValidator = v.union(
	v.literal("rate_limit"),
	v.literal("escalation_active"),
	v.literal("user_inactive"),
	v.literal("toggle_off"),
	v.literal("no_channel"),
	v.literal("account_deleted"),
	/** A nudge whose follow-up closed before it went (answered, dismissed, gone). */
	v.literal("card_closed")
);
export type SuppressedReason = Infer<typeof suppressedReasonValidator>;

/**
 * Why a channel can't take an outreach right now. Computed, never stored;
 * shared by routing, `listChannels`, admin and analytics.
 */
export const ineligibilityReasonValidator = v.union(
	v.literal("disabled"),
	v.literal("requires_plus"),
	v.literal("not_configured"),
	v.literal("paused"),
	v.literal("revoked"),
	v.literal("no_device"),
	v.literal("push_off"),
	v.literal("intent_not_allowed"),
	v.literal("bucket_full")
);
export type IneligibilityReason = Infer<typeof ineligibilityReasonValidator>;

export const channelPlanValidator = v.union(
	v.literal("free"),
	v.literal("plus")
);
export type ChannelPlan = Infer<typeof channelPlanValidator>;

/**
 * Push-mode: `queued → sending → sent`, ending `failed` or `unreachable`.
 * `canceled` when the work is dropped before it ran. Pull-mode
 * (`available → acknowledged`) is reserved; no pull adapter is built.
 */
export const deliveryStatusValidator = v.union(
	v.literal("queued"),
	v.literal("sending"),
	v.literal("sent"),
	v.literal("failed"),
	v.literal("unreachable"),
	v.literal("canceled"),
	v.literal("available"),
	v.literal("acknowledged")
);
export type DeliveryStatus = Infer<typeof deliveryStatusValidator>;

export const channelErrorKindValidator = v.union(
	v.literal("retry"),
	v.literal("permanent"),
	v.literal("unreachable")
);
export type ChannelErrorKind = Infer<typeof channelErrorKindValidator>;

export const identityStatusValidator = v.union(
	v.literal("active"),
	v.literal("paused"),
	v.literal("revoked")
);

export const revokedReasonValidator = v.union(
	v.literal("user_app"),
	v.literal("user_telegram"),
	v.literal("relinked"),
	v.literal("blocked"),
	v.literal("unreachable"),
	v.literal("account_deleted")
);

export const inboundStatusValidator = v.union(
	v.literal("received"),
	v.literal("processed"),
	v.literal("failed"),
	v.literal("ignored")
);

/** Channel-neutral, lock-screen safe. */
export const outreachContentValidator = v.object({
	body: v.string(),
	title: v.optional(v.string()),
});

export const outreachVariantsValidator = v.object({
	telegram: v.optional(v.object({ body: v.string() })),
});

export const reachValidator = v.union(
	v.literal("warm"),
	v.literal("direct"),
	v.literal("quiet")
);

export const generatedByValidator = v.union(
	v.literal("haiku_personalized"),
	v.literal("template_cold_start"),
	v.literal("template_fallback")
);

export const outreachProvenanceValidator = v.object({
	/** An affirmation-shaped send (was the `affirmation` type). */
	affirmation: v.optional(v.boolean()),
	generatedBy: v.optional(generatedByValidator),
	patternContextUsed: v.optional(v.boolean()),
	reachUsed: v.optional(reachValidator),
	triggerReason: v.string(),
});

/** A Telegram text's safeguard level once it's past crisis (#771). */
export const burstLevelValidator = v.union(
	v.literal("none"),
	v.literal("gentle"),
	v.literal("elevated")
);
export type BurstLevel = Infer<typeof burstLevelValidator>;

/**
 * Texts screened on arrival, waiting out a burst for one reply (#771): the
 * link they came in on, so a relink never inherits them; when the reply is
 * due (a later text moves it); and the worst of their safeguard results.
 */
export const pendingBurstValidator = v.object({
	dueAt: v.number(),
	level: burstLevelValidator,
	linkedAt: v.number(),
	/** Elevated, or no safeguard, on any of them: Support resources ride along. */
	support: v.boolean(),
	texts: v.array(v.string()),
});

/**
 * AI replies used on one local day (#771), for the account that used them:
 * a relink to another account starts from none.
 */
export const replyCountValidator = v.object({
	count: v.number(),
	day: v.string(),
	emotionalProfileId: v.id("emotional_profiles"),
});
