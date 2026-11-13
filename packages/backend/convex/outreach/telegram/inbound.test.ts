// @vitest-environment edge-runtime
/**
 * #765: inbound processing for strangers, through the real webhook route and
 * the `telegramInbound` pool, verified on the recorded Bot API calls. What
 * can go wrong: a stranger is replied to on every message; a linked chat or a
 * group gets the stranger reply; message text stays stored.
 */
import { describe, expect, it, vi } from "vitest";
import { asNewUser } from "../../test/harness.helpers";
import { aggregatesMock } from "../../test/mocks.helpers";
import { STRANGER_REPLY } from "./copy";
import {
	backend,
	configure,
	DAY,
	events,
	forgetCalls,
	HOUR,
	messageUpdate,
	post,
	processSoon,
	STRANGER_CHAT,
	sent,
	stubTelegramEachTest,
} from "./telegram.helpers";

vi.mock("../../lib/aggregates", () => aggregatesMock());

stubTelegramEachTest();

describe("strangers", () => {
	it("get one fixed reply per chat per 24 h, and no text is kept", async () => {
		const t = backend();
		const secret = await configure(t);
		forgetCalls();

		for (const text of ["hi", "anyone there?", "hello"]) {
			await post(t, messageUpdate(STRANGER_CHAT, text), secret);
		}
		await post(t, messageUpdate(STRANGER_CHAT + 1), secret);
		await processSoon(t);

		const replies = sent("sendMessage");
		expect(replies.map((c) => c.params.chat_id)).toEqual([
			String(STRANGER_CHAT),
			String(STRANGER_CHAT + 1),
		]);
		expect(replies[0]?.params).toMatchObject({
			protect_content: true,
			text: STRANGER_REPLY,
		});
		const stored = await events(t);
		expect(stored.every((e) => e.status !== "received")).toBe(true);
		expect(JSON.stringify(stored.map((e) => e.payload))).not.toContain(
			"anyone there?"
		);

		vi.advanceTimersByTime(DAY + HOUR);
		await post(t, messageUpdate(STRANGER_CHAT, "back again"), secret);
		await processSoon(t);
		expect(sent("sendMessage")).toHaveLength(3);
	});

	it("aren't chats with a linked identity", async () => {
		const user = await asNewUser();
		const t = backend(user.root);
		const secret = await configure(t);
		await t.run((ctx) =>
			ctx.db.insert("channel_identities", {
				channel: "telegram",
				emotionalProfileId: user.profileId,
				externalId: String(STRANGER_CHAT),
				linkedAt: Date.now(),
				status: "active",
				tokenIdentifier: "test|linked",
			})
		);
		forgetCalls();

		await post(t, messageUpdate(), secret);
		await processSoon(t);

		expect(sent("sendMessage")).toHaveLength(0);
		expect((await events(t))[0]?.status).toBe("ignored");
	});

	it("get no reply in a group chat", async () => {
		const t = backend();
		const secret = await configure(t);
		forgetCalls();
		const update = messageUpdate();
		update.message.chat.type = "group";

		await post(t, update, secret);
		await processSoon(t);

		expect(sent("sendMessage")).toHaveLength(0);
	});
});
