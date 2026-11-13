/**
 * Shared harness for the Telegram tests (#765): a test backend with the
 * rate limiter and `telegramInbound` pool, a recorded Bot API `fetch` stub,
 * and the real webhook route. Two dots in the name keep it out of a deploy.
 * Callers carry `// @vitest-environment edge-runtime` as line 1.
 */
import workpoolTest from "@convex-dev/workpool/test";
import { afterEach, beforeEach, vi } from "vitest";
import rateLimiterSchema from "../../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { api, internal } from "../../_generated/api";
import {
	asAdmin,
	asUnauthed,
	type SeededUser,
} from "../../test/harness.helpers";
import { SECRET_HEADER, TELEGRAM_WEBHOOK_PATH } from "./botApi";

const rateLimiterModules = import.meta.glob(
	"../../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts"
);

export const SECOND = 1000;
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
// 12:00 UTC on a Friday.
export const NOW = Date.UTC(2026, 10, 13, 12, 0);
export const SITE_URL = "https://xolace-test.convex.site";
export const WEBHOOK_URL = `${SITE_URL}${TELEGRAM_WEBHOOK_PATH}`;
export const STRANGER_CHAT = 4_242_424_242;

type BotCall = { method: string; params: Record<string, unknown> };
const calls: BotCall[] = [];
const live = {
	/** Chats every call to which Telegram refuses with a 403 (blocked). */
	blockedChats: new Set<string>(),
	webhookInfo: {} as Record<string, unknown>,
};

/** From now on, Telegram answers 403 to any call naming this chat. */
export function blockChat(chatId: number | string) {
	live.blockedChats.add(String(chatId));
}

/** What `getWebhookInfo` answers next. */
export function setWebhookInfo(info: Record<string, unknown>) {
	live.webhookInfo = info;
}

function botApiStub(input: RequestInfo | URL, init?: RequestInit) {
	const url = String(input);
	const method = url.slice(url.lastIndexOf("/") + 1);
	const params = init?.body ? JSON.parse(String(init.body)) : {};
	calls.push({ method, params });
	if (live.blockedChats.has(String(params.chat_id))) {
		return Promise.resolve(
			new Response(
				JSON.stringify({
					description: "Forbidden: bot was blocked by the user",
					error_code: 403,
					ok: false,
				})
			)
		);
	}
	const results: Record<string, unknown> = {
		getMe: {
			first_name: "Xolace",
			id: 1,
			is_bot: true,
			username: "xolace_dev_bot",
		},
		getWebhookInfo: live.webhookInfo,
		sendMessage: { chat: { id: params.chat_id }, date: 0, message_id: 7 },
	};
	return Promise.resolve(
		new Response(JSON.stringify({ ok: true, result: results[method] ?? true }))
	);
}

/** Every Bot API call so far, in order. */
export const botCalls = () => calls;
export const sent = (method: string) =>
	calls.filter((c) => c.method === method);
export const forgetCalls = () => {
	calls.length = 0;
};

/** Fake clock, the Bot API stub and a bot token, reset around each test. */
export function stubTelegramEachTest() {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		forgetCalls();
		live.blockedChats.clear();
		setWebhookInfo({ pending_update_count: 0, url: WEBHOOK_URL });
		vi.stubGlobal("fetch", vi.fn(botApiStub));
		process.env.TELEGRAM_BOT_TOKEN = "123456:test-token";
		process.env.CONVEX_SITE_URL = SITE_URL;
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		Reflect.deleteProperty(process.env, "TELEGRAM_BOT_TOKEN");
		Reflect.deleteProperty(process.env, "CONVEX_SITE_URL");
	});
}

export function backend(root = asUnauthed()) {
	root.registerComponent("rateLimiter", rateLimiterSchema, rateLimiterModules);
	workpoolTest.register(root, "telegramInbound");
	return root;
}
export type Backend = ReturnType<typeof backend>;

/** Run `configureBot` and return the secret it gave Telegram. */
export async function configure(t: Backend): Promise<string> {
	await t.action(internal.outreach.telegram.bot.configureBot, {});
	return String(sent("setWebhook").at(-1)?.params.secret_token);
}

let nextUpdateId = 1000;
export function messageUpdate(chatId = STRANGER_CHAT, text = "hello?") {
	nextUpdateId += 1;
	return {
		message: {
			chat: { first_name: "Sam", id: chatId, type: "private" },
			date: Math.floor(Date.now() / SECOND),
			from: { first_name: "Sam", id: chatId, is_bot: false },
			message_id: nextUpdateId,
			text,
		},
		update_id: nextUpdateId,
	};
}

export const post = (t: Backend, update: unknown, secret?: string | null) =>
	t.fetch(TELEGRAM_WEBHOOK_PATH, {
		body: JSON.stringify(update),
		headers: secret ? { [SECRET_HEADER]: secret } : undefined,
		method: "POST",
	});

export const events = (t: Backend) =>
	t.run((ctx) => ctx.db.query("inbound_events").take(50));

/** Hops an update takes through the pool: enqueue, its loop, the action. */
const PROCESS_HOPS = 10;

/** Run what's due now, a second at a time, without the pool's idle loop. */
export async function processSoon(t: Backend) {
	for (let hop = 0; hop < PROCESS_HOPS; hop++) {
		vi.advanceTimersByTime(SECOND);
		await t.finishInProgressScheduledFunctions();
	}
}

export const LINK =
	/^https:\/\/t\.me\/xolace_dev_bot\?start=([A-Za-z0-9_-]{43})$/;

export const setTelegram = (
	user: SeededUser,
	config: { enabled: boolean; plan: "free" | "plus" }
) =>
	asAdmin(9, user.root).mutation(api.admin.outreachChannels.setChannelConfig, {
		channel: "telegram",
		...config,
	});

export const createLink = (user: SeededUser) =>
	user.t.action(api.outreach.telegram.link.createLink, {
		consentLanguageVersion: "telegram-1",
		regionCode: "gh",
	});

export const tokenOf = (link: string) => {
	const token = LINK.exec(link)?.[1];
	if (!token) {
		throw new Error(`not a link: ${link}`);
	}
	return token;
};

/** `/start <token>` from a private chat, the way Telegram sends a deep link. */
export function startUpdate(
	token: string,
	chatId = STRANGER_CHAT,
	username?: string
) {
	const update = messageUpdate(chatId, `/start ${token}`);
	return {
		...update,
		message: {
			...update.message,
			from: { ...update.message.from, ...(username && { username }) },
		},
	};
}

export async function start(
	user: SeededUser,
	secret: string,
	token: string,
	chatId = STRANGER_CHAT
) {
	await post(user.root, startUpdate(token, chatId, "sam_t"), secret);
	await processSoon(user.root);
}

export const notifications = (user: SeededUser) =>
	user.root.run(
		async (ctx) =>
			(
				await ctx.db
					.query("preferences")
					.withIndex("by_profile", (q) =>
						q.eq("emotionalProfileId", user.profileId)
					)
					.unique()
			)?.notifications
	);

/** The user's Telegram rows, whatever their status. */
export const identities = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("channel_identities")
			.withIndex("by_profile_channel", (q) =>
				q.eq("emotionalProfileId", user.profileId).eq("channel", "telegram")
			)
			.take(10)
	);

export const consents = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("consent_records")
			.withIndex("by_profile_type", (q) =>
				q
					.eq("emotionalProfileId", user.profileId)
					.eq("consentType", "telegram_outreach")
			)
			.take(10)
	);

export const replies = () => sent("sendMessage").map((c) => c.params.text);

/** Mint a link and redeem it from `chatId`: the whole link flow. */
export async function linkChat(
	user: SeededUser,
	secret: string,
	chatId = STRANGER_CHAT
) {
	await start(user, secret, tokenOf(await createLink(user)), chatId);
}
