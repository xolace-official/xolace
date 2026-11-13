// @vitest-environment edge-runtime
/**
 * #765: the Telegram webhook route, with a Bot API `fetch` stub. What can go
 * wrong: an unauthenticated post is stored; a deployment with no bot accepts
 * posts; a redelivered update is handled twice; work runs before Telegram
 * gets its 200.
 */
import { describe, expect, it } from "vitest";
import {
	backend,
	botCalls,
	configure,
	events,
	forgetCalls,
	messageUpdate,
	post,
	processSoon,
	STRANGER_CHAT,
	sent,
	stubTelegramEachTest,
} from "./telegram.helpers";

stubTelegramEachTest();

describe("webhook secret", () => {
	it("refuses every post when no bot is configured", async () => {
		const t = backend();
		const res = await post(t, messageUpdate(), "anything");
		expect(res.status).toBe(401);
		expect(await events(t)).toHaveLength(0);
	});

	it("refuses every post when the token is gone, even with the right secret", async () => {
		const t = backend();
		const secret = await configure(t);
		Reflect.deleteProperty(process.env, "TELEGRAM_BOT_TOKEN");
		expect((await post(t, messageUpdate(), secret)).status).toBe(401);
		expect(await events(t)).toHaveLength(0);
	});

	it("refuses a missing or wrong secret", async () => {
		const t = backend();
		const secret = await configure(t);
		expect((await post(t, messageUpdate(), null)).status).toBe(401);
		expect((await post(t, messageUpdate(), `${secret}x`)).status).toBe(401);
		expect((await post(t, messageUpdate(), "short")).status).toBe(401);
		expect(await events(t)).toHaveLength(0);
	});
});

describe("webhook intake", () => {
	it("answers 200 before any processing", async () => {
		const t = backend();
		const secret = await configure(t);
		forgetCalls();

		const res = await post(t, messageUpdate(), secret);

		expect(res.status).toBe(200);
		const [event] = await events(t);
		expect(event?.status).toBe("received");
		expect(event?.externalId).toBe(String(STRANGER_CHAT));
		expect(botCalls()).toHaveLength(0);
	});

	it("stores a redelivered update once", async () => {
		const t = backend();
		const secret = await configure(t);
		const update = messageUpdate();

		expect((await post(t, update, secret)).status).toBe(200);
		expect((await post(t, update, secret)).status).toBe(200);
		await processSoon(t);

		expect(await events(t)).toHaveLength(1);
		expect(sent("sendMessage")).toHaveLength(1);
	});

	it("drops a body that isn't an update with a 200, so Telegram stops resending", async () => {
		const t = backend();
		const secret = await configure(t);
		expect((await post(t, { hello: "world" }, secret)).status).toBe(200);
		expect(await events(t)).toHaveLength(0);
	});

	it.each([
		{ message: { chat: { id: 1, type: "private" }, text: 123 }, update_id: 1 },
		{ message: { text: "hi" }, update_id: 2 },
		{ callback_query: { data: "a", from: {}, id: "c" }, update_id: 3 },
		{ my_chat_member: { chat: { id: 1 } }, update_id: 4 },
	])(
		"drops an update whose fields aren't Telegram's shape (%#)",
		async (body) => {
			const t = backend();
			const secret = await configure(t);
			expect((await post(t, body, secret)).status).toBe(200);
			expect(await events(t)).toHaveLength(0);
		}
	);
});
