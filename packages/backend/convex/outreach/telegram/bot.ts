import type { TelegramWebhookInfo } from "@gramio/types";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
	type QueryCtx,
} from "../../_generated/server";
import {
	botApi,
	generateSecret,
	sha256Hex,
	TELEGRAM_WEBHOOK_PATH,
	telegramToken,
} from "./botApi";
import { BOT_PROFILE } from "./copy";

/**
 * This deployment's Telegram bot (#765). One personal bot per developer's dev
 * deployment, one shared bot each for staging and prod, none for previews, e2e
 * or agent worktrees. Runbook: docs/setup/telegram.md.
 */

/** The update kinds the webhook asks for; everything else never arrives. */
export const ALLOWED_UPDATES = [
	"message",
	"callback_query",
	"my_chat_member",
] as const;

const SECOND_MS = 1000;
const HOUR_MS = 3_600_000;
/** A webhook error newer than this counts as drift. */
const RECENT_ERROR_MS = 24 * HOUR_MS;

async function botRow(ctx: QueryCtx): Promise<Doc<"telegram_bot"> | null> {
	return await ctx.db.query("telegram_bot").first();
}

/**
 * The bot, when Telegram can run here at all: a token and a bot
 * `configureBot` set up. Without both, Telegram is `not_configured` and the
 * webhook answers 401.
 */
async function configuredBot(
	ctx: QueryCtx
): Promise<Doc<"telegram_bot"> | null> {
	return telegramToken() ? await botRow(ctx) : null;
}

/** For the Telegram adapter's `configured` (#768). */
export async function telegramConfigured(ctx: QueryCtx): Promise<boolean> {
	return (await configuredBot(ctx)) !== null;
}

function webhookUrl(): string {
	const siteUrl = process.env.CONVEX_SITE_URL;
	if (!siteUrl) {
		throw new Error("CONVEX_SITE_URL is required for the Telegram webhook.");
	}
	return `${siteUrl}${TELEGRAM_WEBHOOK_PATH}`;
}

/** The stored secret hash, or null when the webhook must refuse everything. */
export const webhookSecretHash = internalQuery({
	args: {},
	handler: async (ctx) => (await configuredBot(ctx))?.secretHash ?? null,
	returns: v.union(v.string(), v.null()),
});

export const saveBot = internalMutation({
	args: { secretHash: v.string(), username: v.string() },
	handler: async (ctx, args) => {
		const row = await botRow(ctx);
		const fields = { ...args, configuredAt: Date.now() };
		if (row) {
			await ctx.db.patch("telegram_bot", row._id, fields);
		} else {
			await ctx.db.insert("telegram_bot", fields);
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Point the bot at this deployment and set its profile. Run by hand per
 * deployment (`bunx convex run outreach/telegram/bot:configureBot`), never on
 * deploy. Idempotent; each run rotates the webhook secret.
 */
export const configureBot = internalAction({
	args: {},
	handler: async (ctx) => {
		const me = await botApi.getMe();
		if (!(me.is_bot && me.username)) {
			throw new Error("getMe didn't return a bot with a username.");
		}
		const url = webhookUrl();
		const secret = generateSecret();
		// Kept pending updates are delivered once the new secret is stored.
		await botApi.setWebhook({
			allowed_updates: [...ALLOWED_UPDATES],
			drop_pending_updates: false,
			secret_token: secret,
			url,
		});
		await ctx.runMutation(internal.outreach.telegram.bot.saveBot, {
			secretHash: await sha256Hex(secret),
			username: me.username,
		});
		await botApi.setMyName({ name: BOT_PROFILE.name });
		await botApi.setMyDescription({ description: BOT_PROFILE.description });
		await botApi.setMyShortDescription({
			short_description: BOT_PROFILE.shortDescription,
		});
		await botApi.setMyCommands({ commands: [...BOT_PROFILE.commands] });
		return { username: me.username, webhookUrl: url };
	},
	returns: v.object({ username: v.string(), webhookUrl: v.string() }),
});

export type WebhookDrift = "url_mismatch" | "recent_error" | "pending_growing";

/**
 * What's wrong with the live webhook, if anything. Pure, so the cron's
 * judgement is tested without Telegram.
 */
export function webhookDrift(
	info: Pick<
		TelegramWebhookInfo,
		"last_error_date" | "pending_update_count" | "url"
	>,
	expectedUrl: string,
	previousPendingCount: number | undefined,
	now: number
): WebhookDrift[] {
	const problems: WebhookDrift[] = [];
	if (info.url !== expectedUrl) {
		problems.push("url_mismatch");
	}
	if (
		info.last_error_date !== undefined &&
		now - info.last_error_date * SECOND_MS < RECENT_ERROR_MS
	) {
		problems.push("recent_error");
	}
	if (
		previousPendingCount !== undefined &&
		info.pending_update_count > previousPendingCount
	) {
		problems.push("pending_growing");
	}
	return problems;
}

export const lastPendingCount = internalQuery({
	args: {},
	handler: async (ctx) => (await botRow(ctx))?.lastPendingUpdateCount ?? null,
	returns: v.union(v.number(), v.null()),
});

export const recordPendingCount = internalMutation({
	args: { count: v.number() },
	handler: async (ctx, { count }) => {
		const row = await botRow(ctx);
		if (row) {
			await ctx.db.patch("telegram_bot", row._id, {
				lastPendingUpdateCount: count,
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Daily drift check: compares the live webhook with this deployment and logs
 * an error on drift. Never re-points the bot; a person reruns `configureBot`.
 */
export const checkWebhook = internalAction({
	args: {},
	handler: async (ctx) => {
		const secretHash = await ctx.runQuery(
			internal.outreach.telegram.bot.webhookSecretHash,
			{}
		);
		if (secretHash === null) {
			return null;
		}
		const info = await botApi.getWebhookInfo();
		const previous = await ctx.runQuery(
			internal.outreach.telegram.bot.lastPendingCount,
			{}
		);
		const problems = webhookDrift(
			info,
			webhookUrl(),
			previous ?? undefined,
			Date.now()
		);
		await ctx.runMutation(internal.outreach.telegram.bot.recordPendingCount, {
			count: info.pending_update_count,
		});
		if (problems.length > 0) {
			// The URL and Telegram's error text stay out: they name the deployment
			// and can quote a chat.
			console.error(
				`Telegram webhook drift: ${problems.join(", ")} (pending ${info.pending_update_count}). Rerun outreach/telegram/bot:configureBot if the bot should point here.`
			);
		}
		return null;
	},
	returns: v.null(),
});
