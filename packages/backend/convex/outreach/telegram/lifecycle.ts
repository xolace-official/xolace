import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	type QueryCtx,
} from "../../_generated/server";
import type { OutreachChannel, revokedReasonValidator } from "../validators";
import { collapseChat } from "./checkIn";

/**
 * How a Telegram link ends (#767): every revoke goes through
 * `revokeIdentity`, so each one leaves the row `revoked` with its reason and
 * appends a `telegram_outreach` consent `revoked` row. Losing Plus or the
 * kill switch never comes here: those make the channel ineligible, not
 * unlinked. A revoke collapses the chat's live check-ins (#768).
 */

type RevokedReason = Infer<typeof revokedReasonValidator>;

/** A profile has a handful of rows per channel at most (one per linked chat). */
const MAX_IDENTITIES_PER_CHANNEL = 10;

const DAY_MS = 24 * 3_600_000;
/** How long a revoked row is kept before the chat is a stranger again. */
export const REVOKED_RETENTION_MS = 30 * DAY_MS;
const PURGE_BATCH = 100;

/** Consent wording for a revoke when no grant row says which was shown. */
export const FALLBACK_CONSENT_VERSION = "1.0";

export function isLive(identity: Doc<"channel_identities">): boolean {
	return identity.status === "active" || identity.status === "paused";
}

/** Live statuses first, so revoked history can never crowd a live link out. */
const IDENTITY_STATUSES = ["active", "paused", "revoked"] as const;

/**
 * A profile's rows on a channel: every live one, then the newest revoked. A
 * relink leaves the old chat's row revoked beside the new one, so callers look
 * at every row.
 */
export async function identitiesOf(
	ctx: QueryCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	channel: OutreachChannel
): Promise<Doc<"channel_identities">[]> {
	const rows: Doc<"channel_identities">[] = [];
	for (const status of IDENTITY_STATUSES) {
		rows.push(
			...(await ctx.db
				.query("channel_identities")
				.withIndex("by_profile_channel_status", (q) =>
					q
						.eq("emotionalProfileId", emotionalProfileId)
						.eq("channel", channel)
						.eq("status", status)
				)
				.order("desc")
				.take(MAX_IDENTITIES_PER_CHANNEL))
		);
	}
	return rows;
}

/** The chat's one row, if it has ever been linked (and not yet purged). */
export async function identityOfChat(
	ctx: QueryCtx,
	chatId: string
): Promise<Doc<"channel_identities"> | null> {
	return await ctx.db
		.query("channel_identities")
		.withIndex("by_channel_external", (q) =>
			q.eq("channel", "telegram").eq("externalId", chatId)
		)
		.first();
}

/** Append a `telegram_outreach` consent `granted` row, in the wording shown. */
export async function grantConsent(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	consentLanguageVersion: string
): Promise<void> {
	const now = Date.now();
	await ctx.db.insert("consent_records", {
		consentLanguageVersion,
		consentType: "telegram_outreach",
		createdAt: now,
		emotionalProfileId,
		grantedAt: now,
		status: "granted",
	});
}

/** Append a `telegram_outreach` consent `revoked` row, in the wording last granted. */
async function revokeConsent(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<void> {
	const lastGrant = await ctx.db
		.query("consent_records")
		.withIndex("by_profile_type", (q) =>
			q
				.eq("emotionalProfileId", emotionalProfileId)
				.eq("consentType", "telegram_outreach")
		)
		.order("desc")
		.first();
	const now = Date.now();
	await ctx.db.insert("consent_records", {
		consentLanguageVersion:
			lastGrant?.consentLanguageVersion ?? FALLBACK_CONSENT_VERSION,
		consentType: "telegram_outreach",
		createdAt: now,
		emotionalProfileId,
		revokedAt: now,
		status: "revoked",
	});
}

/**
 * End a live link: `revoked` with its reason, any pending reflection,
 * waiting burst and recent turns dropped, its live check-ins collapsed, and a consent `revoked` row for the
 * profile it belonged to.
 * A row that's already revoked is left as it is.
 */
export async function revokeIdentity(
	ctx: MutationCtx,
	identity: Doc<"channel_identities">,
	reason: RevokedReason
): Promise<boolean> {
	if (!isLive(identity)) {
		return false;
	}
	await ctx.db.patch("channel_identities", identity._id, {
		awaitingReflection: undefined,
		pendingBurst: undefined,
		recentTurns: undefined,
		revokedAt: Date.now(),
		revokedReason: reason,
		status: "revoked",
	});
	await revokeConsent(ctx, identity.emotionalProfileId);
	await collapseChat(ctx, identity.externalId);
	return true;
}

/** How long Telegram lets a bot delete its own message in a private chat. */
export const DELETABLE_FOR_MS = 2 * DAY_MS;
/** A busy Plus chat sends ~120 messages in 48 h; well past that is a bug. */
const MAX_SENT_KEPT = 300;

/**
 * Note a message the bot just sent to this chat, so account deletion and a
 * data wipe can delete it while Telegram still allows (#773). A chat with no
 * row (a stranger) has nothing to erase.
 */
export async function rememberSent(
	ctx: MutationCtx,
	chatId: string,
	messageId: string
): Promise<void> {
	const identity = await identityOfChat(ctx, chatId);
	if (!identity) {
		return;
	}
	const now = Date.now();
	const kept = (identity.sentMessages ?? []).filter(
		(m) => m.at > now - DELETABLE_FOR_MS
	);
	await ctx.db.patch("channel_identities", identity._id, {
		sentMessages: [...kept, { at: now, id: messageId }].slice(-MAX_SENT_KEPT),
	});
}

/** `rememberSent`, for an action that has just sent. */
export const recordSent = internalMutation({
	args: { chatId: v.string(), messageId: v.string() },
	handler: async (ctx, { chatId, messageId }) => {
		await rememberSent(ctx, chatId, messageId);
		return null;
	},
	returns: v.null(),
});

/**
 * A line meant for this chat's live link came back 403 (blocked, or the
 * chat is gone): the link is revoked `unreachable`.
 */
export const markUnreachable = internalMutation({
	args: {
		chatId: v.string(),
		/**
		 * The link the failed send was for. A relink reuses the chat's row with a
		 * new `linkedAt`; a 403 for the old link must not end the new one.
		 */
		linkedAt: v.optional(v.number()),
	},
	handler: async (ctx, { chatId, linkedAt }) => {
		const identity = await identityOfChat(ctx, chatId);
		if (
			identity &&
			(linkedAt === undefined || identity.linkedAt === linkedAt)
		) {
			await revokeIdentity(ctx, identity, "unreachable");
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Delete revoked rows 30 days after `revokedAt`; after that the chat is a
 * stranger. Runs from a daily cron, a batch at a time.
 */
export const purgeRevoked = internalMutation({
	args: {},
	handler: async (ctx) => {
		const expired = await ctx.db
			.query("channel_identities")
			.withIndex("by_status_revokedAt", (q) =>
				q
					.eq("status", "revoked")
					// A revoked row always has `revokedAt`; never purge one without.
					.gt("revokedAt", 0)
					.lte("revokedAt", Date.now() - REVOKED_RETENTION_MS)
			)
			.take(PURGE_BATCH);
		for (const identity of expired) {
			await ctx.db.delete("channel_identities", identity._id);
		}
		if (expired.length === PURGE_BATCH) {
			await ctx.scheduler.runAfter(
				0,
				internal.outreach.telegram.lifecycle.purgeRevoked,
				{}
			);
		}
		return null;
	},
	returns: v.null(),
});
