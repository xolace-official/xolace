import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import {
	action,
	internalMutation,
	type MutationCtx,
} from "../../_generated/server";
import { requireAuth } from "../../lib/auth";
import { updateNotificationPrefs } from "../../lib/notificationPrefs";
import { rateLimiter } from "../../lib/rateLimits";
import { countryFromRegion, putChannelFirst } from "../channels";
import { channelUnavailable } from "../router";
import { configuredBot } from "./bot";
import { sha256Hex } from "./botApi";
import {
	FALLBACK_CONSENT_VERSION,
	grantConsent,
	identitiesOf,
	identityOfChat,
	revokeIdentity,
} from "./lifecycle";
import type { Line } from "./lines";

/**
 * Linking a Telegram chat to a Xolace account (#766). The app mints a
 * one-use link (`createLink`); the chat redeems it with `/start <token>`
 * (`redeemLinkToken`, from the inbound pool). Only the token's SHA-256 is
 * ever stored: the webhook hashes it before the update is kept.
 */

const MINUTE_MS = 60_000;
/** How long a minted link works. */
export const LINK_TOKEN_TTL_MS = 15 * MINUTE_MS;
const TOKEN_BYTES = 32;
const BASE64_PADDING = /[=]+$/;

/**
 * 32 random bytes, base64url without padding: 43 characters, within
 * Telegram's `start` parameter (`A-Z a-z 0-9 _ -`, up to 64).
 *
 * @see https://core.telegram.org/bots/features#deep-linking
 */
function generateLinkToken(): string {
	let binary = "";
	for (const byte of crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(BASE64_PADDING, "");
}

/**
 * Store a minted token's hash for the signed-in user. Throws
 * `telegram_unavailable` (with the reason) when Telegram isn't open to them
 * and `rate_limited` past `telegramLinkMint`. Minting retires the user's
 * older live token, so only the newest link works.
 */
export const storeLinkToken = internalMutation({
	args: {
		consentLanguageVersion: v.string(),
		regionCode: v.optional(v.string()),
		tokenHash: v.string(),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const unavailable = await channelUnavailable(ctx, "telegram", profile);
		const bot = await configuredBot(ctx);
		if (unavailable || !bot) {
			throw new ConvexError({
				code: "telegram_unavailable",
				reason: unavailable ?? "not_configured",
			});
		}
		const { ok, retryAfter } = await rateLimiter.limit(
			ctx,
			"telegramLinkMint",
			{ key: profile._id }
		);
		if (!ok) {
			throw new ConvexError({ code: "rate_limited", retryAfter });
		}
		const now = Date.now();
		// Each mint retires the one before, so at most the newest is live.
		const previous = await ctx.db
			.query("channel_link_tokens")
			.withIndex("by_profile_channel", (q) =>
				q.eq("emotionalProfileId", profile._id).eq("channel", "telegram")
			)
			.order("desc")
			.first();
		if (previous && previous.usedAt === undefined) {
			await ctx.db.patch("channel_link_tokens", previous._id, { usedAt: now });
		}
		const country = countryFromRegion(args.regionCode);
		await ctx.db.insert("channel_link_tokens", {
			channel: "telegram",
			consentLanguageVersion: args.consentLanguageVersion,
			emotionalProfileId: profile._id,
			expiresAt: now + LINK_TOKEN_TTL_MS,
			tokenHash: args.tokenHash,
			...(country && { regionCode: country }),
		});
		return bot.username;
	},
	returns: v.string(),
});

/**
 * Mint a link for the signed-in user: `https://t.me/<bot>?start=<token>`,
 * good once, for 15 minutes. The app opens it (or offers Copy link).
 */
export const createLink = action({
	args: {
		consentLanguageVersion: v.string(),
		/** The device's region (ISO 3166-1 alpha-2), for crisis resources. */
		regionCode: v.optional(v.string()),
	},
	handler: async (ctx, args): Promise<string> => {
		const token = generateLinkToken();
		const username: string = await ctx.runMutation(
			internal.outreach.telegram.link.storeLinkToken,
			{ ...args, tokenHash: await sha256Hex(token) }
		);
		return `https://t.me/${username}?start=${token}`;
	},
	returns: v.string(),
});

/**
 * Redeem a `/start <token>` in a private chat, in the caller's transaction,
 * and return the lines to send; null when the token isn't good (unknown,
 * expired, used, an account no longer active), with nothing changed.
 *
 * A good token is marked used, the chat's one row is made `active` for the
 * token's account (inserted, reactivated or moved), Telegram goes first in
 * the channel order, a `telegram_outreach` consent is granted and gentle
 * return is turned on (by merge; nothing else changes).
 *
 * Latest link wins both ways (#767): a chat live for another account is
 * revoked `relinked` there and moves here (the chat is told it moved); this
 * account's other live chats are revoked `relinked` and told.
 */
export async function redeemLinkToken(
	ctx: MutationCtx,
	args: {
		chatId: string;
		displayHandle?: string;
		telegramUserId?: string;
		tokenHash: string;
	}
): Promise<Line[] | null> {
	const now = Date.now();
	const token = await ctx.db
		.query("channel_link_tokens")
		.withIndex("by_hash", (q) => q.eq("tokenHash", args.tokenHash))
		.first();
	if (
		!token ||
		token.channel !== "telegram" ||
		token.usedAt !== undefined ||
		token.expiresAt <= now
	) {
		return null;
	}
	const { emotionalProfileId } = token;
	const user = await ctx.db
		.query("users")
		.withIndex("by_emotional_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.first();
	if (user?.accountStatus !== "active") {
		return null;
	}
	await ctx.db.patch("channel_link_tokens", token._id, { usedAt: now });

	const lines: Line[] = [];
	// This account's other chats: the newest link is its only one.
	for (const other of await identitiesOf(ctx, emotionalProfileId, "telegram")) {
		if (
			other.externalId !== args.chatId &&
			(await revokeIdentity(ctx, other, "relinked"))
		) {
			lines.push({ chatId: other.externalId, kind: "old_chat" });
		}
	}

	const fields = {
		emotionalProfileId,
		linkedAt: now,
		status: "active" as const,
		tokenIdentifier: user.tokenIdentifier,
		...(token.regionCode && { country: token.regionCode }),
		...(args.displayHandle && { displayHandle: args.displayHandle }),
		...(args.telegramUserId && { telegramUserId: args.telegramUserId }),
	};
	const existing = await identityOfChat(ctx, args.chatId);
	// This chat, live for another account: it leaves that account.
	const moved =
		existing !== null &&
		existing.emotionalProfileId !== emotionalProfileId &&
		(await revokeIdentity(ctx, existing, "relinked"));
	if (existing) {
		await ctx.db.patch("channel_identities", existing._id, {
			// A handle removed since the last link goes with it.
			displayHandle: undefined,
			...fields,
			revokedAt: undefined,
			revokedReason: undefined,
		});
	} else {
		await ctx.db.insert("channel_identities", {
			...fields,
			channel: "telegram",
			externalId: args.chatId,
		});
	}

	await grantConsent(
		ctx,
		emotionalProfileId,
		token.consentLanguageVersion ?? FALLBACK_CONSENT_VERSION
	);
	await putChannelFirst(ctx, emotionalProfileId, "telegram");
	await updateNotificationPrefs(ctx, emotionalProfileId, {
		gentleReturn: true,
	});
	return [
		{
			chatId: args.chatId,
			kind: moved ? "relinked" : "welcome",
			linkedAt: now,
		},
		...lines,
	];
}
