// @vitest-environment edge-runtime
/**
 * #765: bot setup, the drift check and whether Telegram counts as
 * configured. What can go wrong: re-running setup leaves the old secret
 * working or stores the secret itself; the drift check misses a misrouted
 * webhook or re-points the bot; a deployment with no bot calls Telegram.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../../_generated/api";
import { telegramConfigured, webhookDrift } from "./bot";
import { sha256Hex } from "./botApi";
import {
	backend,
	botCalls,
	configure,
	DAY,
	forgetCalls,
	HOUR,
	messageUpdate,
	NOW,
	post,
	SECOND,
	sent,
	setWebhookInfo,
	stubTelegramEachTest,
	WEBHOOK_URL,
} from "./telegram.helpers";

stubTelegramEachTest();

const NOW_SECONDS = NOW / SECOND;
const HOUR_SECONDS = HOUR / SECOND;
const DAY_SECONDS = DAY / SECOND;

describe("configureBot", () => {
	it("points the webhook here and sets the bot's profile", async () => {
		const t = backend();
		const secret = await configure(t);

		expect(sent("setWebhook")[0]?.params).toEqual({
			allowed_updates: ["message", "callback_query", "my_chat_member"],
			drop_pending_updates: false,
			secret_token: secret,
			url: WEBHOOK_URL,
		});
		for (const method of [
			"setMyName",
			"setMyDescription",
			"setMyShortDescription",
			"setMyCommands",
		]) {
			expect(sent(method)).toHaveLength(1);
		}
		const [bot] = await t.run((ctx) => ctx.db.query("telegram_bot").take(5));
		expect(bot).toMatchObject({
			secretHash: await sha256Hex(secret),
			username: "xolace_dev_bot",
		});
		expect(JSON.stringify(bot)).not.toContain(secret);
	});

	it("is idempotent and rotates the secret", async () => {
		const t = backend();
		const first = await configure(t);
		const second = await configure(t);

		expect(second).not.toBe(first);
		expect(
			await t.run((ctx) => ctx.db.query("telegram_bot").take(5))
		).toHaveLength(1);
		expect((await post(t, messageUpdate(), first)).status).toBe(401);
		expect((await post(t, messageUpdate(), second)).status).toBe(200);
	});
});

describe("drift check", () => {
	const healthy = { pending_update_count: 0, url: WEBHOOK_URL };
	const drift = (
		info: Partial<typeof healthy> & { last_error_date?: number },
		previous?: number
	) => webhookDrift({ ...healthy, ...info }, WEBHOOK_URL, previous, NOW);

	it("judges url, recent errors and a growing backlog", () => {
		expect(drift({}, 0)).toEqual([]);
		expect(drift({ url: "https://elsewhere" }, 0)).toEqual(["url_mismatch"]);
		expect(drift({ last_error_date: NOW_SECONDS - HOUR_SECONDS }, 0)).toEqual([
			"recent_error",
		]);
		expect(
			drift({ last_error_date: NOW_SECONDS - 2 * DAY_SECONDS }, 0)
		).toEqual([]);
		expect(drift({ pending_update_count: 9 }, 4)).toEqual(["pending_growing"]);
		expect(drift({ pending_update_count: 500 }, 0)).toEqual([
			"pending_growing",
		]);
		expect(drift({ pending_update_count: 9 }, undefined)).toEqual([]);
		expect(drift({ pending_update_count: 3 }, 9)).toEqual([]);
	});

	it("logs on a url mismatch or a recent error and never re-points", async () => {
		const t = backend();
		await configure(t);
		forgetCalls();
		const errors = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		await t.action(internal.outreach.telegram.bot.checkWebhook, {});
		expect(errors).not.toHaveBeenCalled();

		setWebhookInfo({
			pending_update_count: 0,
			url: "https://elsewhere.example/hook",
		});
		await t.action(internal.outreach.telegram.bot.checkWebhook, {});
		expect(errors).toHaveBeenLastCalledWith(
			expect.stringContaining("url_mismatch")
		);

		setWebhookInfo({
			last_error_date: NOW_SECONDS - 1,
			pending_update_count: 0,
			url: WEBHOOK_URL,
		});
		await t.action(internal.outreach.telegram.bot.checkWebhook, {});
		expect(errors).toHaveBeenLastCalledWith(
			expect.stringContaining("recent_error")
		);

		expect(sent("setWebhook")).toHaveLength(0);
		expect(sent("deleteWebhook")).toHaveLength(0);
		errors.mockRestore();
	});

	it("does nothing on a deployment with no bot", async () => {
		const t = backend();
		await t.action(internal.outreach.telegram.bot.checkWebhook, {});
		expect(botCalls()).toHaveLength(0);
	});
});

describe("eligibility", () => {
	it("Telegram is configured only with a token and a set-up bot", async () => {
		const t = backend();
		expect(await t.run((ctx) => telegramConfigured(ctx))).toBe(false);
		await configure(t);
		expect(await t.run((ctx) => telegramConfigured(ctx))).toBe(true);
		Reflect.deleteProperty(process.env, "TELEGRAM_BOT_TOKEN");
		expect(await t.run((ctx) => telegramConfigured(ctx))).toBe(false);
	});
});
