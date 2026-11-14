// @vitest-environment edge-runtime
/**
 * #765: inbound processing for strangers, through the real webhook route and
 * the `telegramInbound` pool, verified on the recorded Bot API calls. What
 * can go wrong: a stranger is replied to on every message; a linked chat or a
 * group gets the stranger reply; message text stays stored.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../../_generated/api";
import { asNewUser } from "../../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../../test/mocks.helpers";
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
vi.mock("../../revenuecat", () => revenuecatMock());
const written = vi.hoisted(() => ({ count: 0 }));
vi.mock("../../ai/telegram/reply", () => ({
	writeReply: async () => {
		written.count += 1;
		return "Thanks for writing.\nWhat's on your mind?";
	},
}));

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

		// Answered by the AI reply (#770), never the stranger line.
		expect(sent("sendMessage").map((c) => c.params.text)).not.toContain(
			STRANGER_REPLY
		);
		expect((await events(t))[0]?.status).toBe("processed");
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

describe("the inbound pool's one slot", () => {
	it("is free again before a linked chat's text is screened or answered", async () => {
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
		await post(t, messageUpdate(STRANGER_CHAT, "rough day"), secret);
		const [event] = await events(t);
		if (!event) {
			throw new Error("no inbound event");
		}
		forgetCalls();
		written.count = 0;

		// What the pool runs: it claims the update and hands the reply off.
		await t.action(internal.outreach.telegram.inbound.processUpdate, {
			eventId: event._id,
		});
		expect(sent("sendChatAction")).toHaveLength(0);
		expect(written.count).toBe(0);
		expect((await events(t))[0]?.status).toBe("processed");

		await processSoon(t);
		expect(sent("sendChatAction").length).toBeGreaterThan(0);
		expect(written.count).toBe(1);
		expect(sent("sendMessage").map((c) => c.params.text)).toEqual([
			"Thanks for writing.\nWhat's on your mind?",
		]);
	});
});
