import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { adminMutation } from "../lib/adminAuth";
import { hasPremium } from "../lib/premium";
import { rateLimiter } from "../lib/rateLimits";
import { DEFAULT_CHANNEL_ORDER } from "../outreach/channels";
import {
	channelIneligibility,
	ESCALATION_HOLD_MS,
	isDormant,
	lastTelegramCrisisAt,
	latestHeldEscalation,
	loadNotifications,
	openEscalationCard,
} from "../outreach/router";
import { DAILY_REPLY_CAP } from "../outreach/telegram/caps";
import {
	currentLink,
	identitiesOf,
	lastRevoked,
} from "../outreach/telegram/lifecycle";
import {
	channelErrorKindValidator,
	deliveryStatusValidator,
	ineligibilityReasonValidator,
	outreachChannelValidator,
	outreachIntentValidator,
	outreachOutcomeValidator,
	revokedReasonValidator,
	type SuppressedReason,
} from "../outreach/validators";
import { localDayKey } from "../streaks/activityLog";
import { profileTimezone } from "../streaks/state";

/**
 * The admin's read-only look at one user's channels and outreach (#775).
 * A mutation only so every look writes its audit row. It returns routing
 * facts and never what anyone wrote: no message or card text, no user text
 * or AI reply, no safeguard or crisis detail, no Telegram id or handle, no
 * token or hash. Nothing here acts on a user's links.
 */

const DAY_MS = 24 * 3_600_000;
/** How far back the outreach list reaches. */
const OUTREACH_WINDOW_MS = 30 * DAY_MS;
/** At most this many outreach rows, newest first. */
const OUTREACH_LIMIT = 50;
/** Deliveries per outreach: one channel plus its one fallback, with room. */
const DELIVERIES_PER_OUTREACH = 10;

/**
 * A suppression reason as an admin sees it: the crisis and dormancy holds
 * read `safety` and `dormancy`, as the suppressions do.
 */
const adminSuppressedReasonValidator = v.union(
	v.literal("rate_limit"),
	v.literal("safety"),
	v.literal("dormancy"),
	v.literal("toggle_off"),
	v.literal("no_channel"),
	v.literal("account_deleted"),
	v.literal("card_closed")
);

const channelEntryValidator = v.object({
	channel: outreachChannelValidator,
	eligible: v.boolean(),
	/** Why outreach can't land here now; absent when eligible. */
	ineligibleReason: v.optional(ineligibilityReasonValidator),
	linkedAt: v.optional(v.number()),
	revokedAt: v.optional(v.number()),
	revokedReason: v.optional(revokedReasonValidator),
	/** `app` for push, which has no link. */
	status: v.union(
		v.literal("app"),
		v.literal("active"),
		v.literal("paused"),
		v.literal("revoked"),
		v.literal("not_linked")
	),
});
type ChannelEntry = Infer<typeof channelEntryValidator>;

const deliveryEntryValidator = v.object({
	attemptedAt: v.number(),
	channel: outreachChannelValidator,
	errorKind: v.optional(channelErrorKindValidator),
	isFallback: v.boolean(),
	status: deliveryStatusValidator,
});

const outreachEntryValidator = v.object({
	createdAt: v.number(),
	deliveries: v.array(deliveryEntryValidator),
	intent: outreachIntentValidator,
	outcome: outreachOutcomeValidator,
	suppressedReason: v.optional(adminSuppressedReasonValidator),
});

/**
 * A hold on routine outreach, as the router applies it. `safety` holds every
 * intent but an open crisis card's own nudge; `dormancy` holds only gentle
 * returns, pattern nudges and kindling.
 */
const suppressionValidator = v.object({
	/** Absent when it lasts until something happens (a card closes, a return). */
	endsAt: v.optional(v.number()),
	kind: v.union(v.literal("safety"), v.literal("dormancy")),
});
type Suppression = Infer<typeof suppressionValidator>;

const usedOfValidator = v.object({ cap: v.number(), used: v.number() });

const outreachViewValidator = v.object({
	channels: v.array(channelEntryValidator),
	outreach: v.array(outreachEntryValidator),
	suppressions: v.array(suppressionValidator),
	usage: v.object({
		aiReplies: usedOfValidator,
		telegramOutreach: usedOfValidator,
	}),
});

function adminReason(
	reason: SuppressedReason
): Infer<typeof adminSuppressedReasonValidator> {
	switch (reason) {
		case "escalation_active":
			return "safety";
		case "user_inactive":
			return "dormancy";
		default:
			return reason;
	}
}

/** The user's row, from the admin's own issuer: one Clerk instance. */
async function userByClerkId(
	ctx: MutationCtx,
	issuer: string,
	clerkUserId: string
): Promise<Doc<"users"> | null> {
	return await ctx.db
		.query("users")
		.withIndex("by_token", (q) =>
			q.eq("tokenIdentifier", `${issuer}|${clerkUserId}`)
		)
		.unique();
}

/**
 * Today's Telegram outreach against its daily bucket: the rate limiter's
 * fixed window, not the user's local day. An acute nudge past the cap goes
 * anyway and isn't counted here.
 */
async function telegramOutreachUsage(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">
) {
	const { config, value } = await rateLimiter.getValue(
		ctx,
		"outreachTelegram",
		{ key: profileId }
	);
	return {
		cap: config.rate,
		used: Math.max(0, config.rate - Math.floor(value)),
	};
}

/** AI replies on the user's local day, counted on their live link. */
async function aiReplyUsage(
	ctx: MutationCtx,
	profile: Doc<"emotional_profiles">,
	identities: Doc<"channel_identities">[],
	now: number
) {
	const cap =
		DAILY_REPLY_CAP[(await hasPremium(ctx, profile)) ? "plus" : "free"];
	const day = localDayKey(now, await profileTimezone(ctx, profile));
	const counted = currentLink(identities)?.replyCount;
	const used =
		counted?.day === day && counted.emotionalProfileId === profile._id
			? counted.count
			: 0;
	return { cap, used };
}

async function channelEntries(
	ctx: MutationCtx,
	profile: Doc<"emotional_profiles">,
	telegramIdentities: Doc<"channel_identities">[],
	telegramBucketFull: boolean
): Promise<ChannelEntry[]> {
	const notifications = await loadNotifications(ctx, profile._id);
	const order = notifications?.channelOrder ?? DEFAULT_CHANNEL_ORDER;
	const shown = [
		...new Set([
			...order,
			// A link outside the order still shows, after it.
			...(telegramIdentities.length > 0 ? (["telegram"] as const) : []),
		]),
	];
	const entries: ChannelEntry[] = [];
	for (const channel of shown) {
		// Both channels take a nudge, so it asks only about the channel.
		let reason = await channelIneligibility(
			ctx,
			channel,
			{ emotionalProfileId: profile._id, intent: "nudge" },
			profile,
			notifications
		);
		if (reason === null && channel === "telegram" && telegramBucketFull) {
			reason = "bucket_full";
		}
		const eligibility = {
			eligible: reason === null,
			...(reason !== null && { ineligibleReason: reason }),
		};
		if (channel === "push") {
			entries.push({ channel, status: "app", ...eligibility });
			continue;
		}
		const link =
			currentLink(telegramIdentities) ?? lastRevoked(telegramIdentities);
		entries.push(
			link
				? {
						channel,
						linkedAt: link.linkedAt,
						status: link.status,
						...(link.revokedAt !== undefined && {
							revokedAt: link.revokedAt,
						}),
						...(link.revokedReason && { revokedReason: link.revokedReason }),
						...eligibility,
					}
				: { channel, status: "not_linked", ...eligibility }
		);
	}
	return entries;
}

async function outreachEntries(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">,
	now: number
) {
	const rows = await ctx.db
		.query("outreach")
		.withIndex("by_profile_created", (q) =>
			q
				.eq("emotionalProfileId", profileId)
				.gte("createdAt", now - OUTREACH_WINDOW_MS)
		)
		.order("desc")
		.take(OUTREACH_LIMIT);
	const entries: Infer<typeof outreachEntryValidator>[] = [];
	for (const row of rows) {
		const deliveries = await ctx.db
			.query("outreach_deliveries")
			.withIndex("by_outreach", (q) => q.eq("outreachId", row._id))
			.take(DELIVERIES_PER_OUTREACH);
		entries.push({
			createdAt: row.createdAt,
			deliveries: deliveries.map((d) => ({
				attemptedAt: d.finishedAt ?? d.createdAt,
				channel: d.channel,
				isFallback: d.isFallback,
				status: d.status,
				...(d.error && { errorKind: d.error.kind }),
			})),
			intent: row.intent,
			outcome: row.outcome,
			...(row.suppressedReason && {
				suppressedReason: adminReason(row.suppressedReason),
			}),
		});
	}
	return entries;
}

/** Holds on routine outreach right now, by end time alone. */
async function activeSuppressions(
	ctx: MutationCtx,
	profile: Doc<"emotional_profiles">,
	now: number
): Promise<Suppression[]> {
	const suppressions: Suppression[] = [];
	const openCard = await openEscalationCard(ctx, profile._id);
	const latestEvent = await latestHeldEscalation(ctx, profile._id, now);
	// A repeated Telegram crisis shares the first one's event: the hold runs
	// from whichever came last.
	const heldFrom = Math.max(
		latestEvent?.createdAt ?? Number.NEGATIVE_INFINITY,
		(await lastTelegramCrisisAt(ctx, profile._id)) ?? Number.NEGATIVE_INFINITY
	);
	if (openCard) {
		// Held until the card closes, however long that is.
		suppressions.push({ kind: "safety" });
	} else if (heldFrom > now - ESCALATION_HOLD_MS) {
		suppressions.push({
			endsAt: heldFrom + ESCALATION_HOLD_MS,
			kind: "safety",
		});
	}
	if (isDormant(profile, now)) {
		// Held until they come back to a session.
		suppressions.push({ kind: "dormancy" });
	}
	return suppressions;
}

/**
 * Look at one user's channels and outreach, by Clerk user id. Writes an
 * audit row (which admin, whose outreach, when) on every call, a look at a
 * user who doesn't exist included; returns null for that user.
 */
export const viewUserOutreach = adminMutation({
	args: { clerkUserId: v.string() },
	handler: async (ctx, { clerkUserId }) => {
		const now = Date.now();
		await ctx.db.insert("admin_audit_log", {
			action: "outreach_viewed",
			adminClerkUserId: ctx.identity.subject,
			at: now,
			targetClerkUserId: clerkUserId,
		});

		const user = await userByClerkId(ctx, ctx.identity.issuer, clerkUserId);
		const profile =
			user && (await ctx.db.get("emotional_profiles", user.emotionalProfileId));
		if (!profile) {
			return null;
		}

		const telegramIdentities = await identitiesOf(ctx, profile._id, "telegram");
		const telegramOutreach = await telegramOutreachUsage(ctx, profile._id);
		return {
			channels: await channelEntries(
				ctx,
				profile,
				telegramIdentities,
				telegramOutreach.used >= telegramOutreach.cap
			),
			outreach: await outreachEntries(ctx, profile._id, now),
			suppressions: await activeSuppressions(ctx, profile, now),
			usage: {
				aiReplies: await aiReplyUsage(ctx, profile, telegramIdentities, now),
				telegramOutreach,
			},
		};
	},
	returns: v.union(v.null(), outreachViewValidator),
});
