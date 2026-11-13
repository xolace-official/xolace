// @vitest-environment edge-runtime
/**
 * #767: every way a Telegram link ends or moves, from either side. Driven
 * through the public `reachMe` mutations, the real webhook route and the
 * `telegramInbound` pool, and checked on `listChannels`, the consent rows
 * and the recorded Bot API calls. What can go wrong: a revoke leaves no
 * `revoked` consent row, or the wrong reason; a paused or revoked chat still
 * looks linked; a 403 or a block leaves the link standing; a relink makes a
 * second row instead of reactivating the one; the old side of a relink isn't
 * told; revoked rows outlive their 30 days, or go early.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import { expectCode } from "../../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../../test/mocks.helpers";
import {
	GOODBYE_APP,
	HELP,
	LINKED_COMMANDS,
	OLD_CHAT,
	RELINKED,
	REVOKED_REPLY,
	STOP_REPLY,
	STRANGER_REPLY,
	WELCOME,
} from "./copy";
import { REVOKED_RETENTION_MS } from "./lifecycle";
import {
	backend,
	blockChat,
	configure,
	consents,
	forgetCalls,
	HOUR,
	identities,
	linkChat,
	messageUpdate,
	post,
	processSoon,
	replies,
	STRANGER_CHAT,
	sent,
	setTelegram,
	stubTelegramEachTest,
} from "./telegram.helpers";

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../revenuecat", () => revenuecatMock(() => false));

stubTelegramEachTest();

const CHAT = String(STRANGER_CHAT);

/** A signed-in user with a linked Telegram chat. */
async function linked() {
	const user = await asNewUser();
	backend(user.root);
	const secret = await configure(user.root);
	await setTelegram(user, { enabled: true, plan: "free" });
	await linkChat(user, secret);
	forgetCalls();
	return { secret, user };
}

const telegramEntry = async (user: SeededUser) =>
	(await user.t.query(api.outreach.reachMe.listChannels, {})).find(
		(c) => c.channel === "telegram"
	);

const unlink = (user: SeededUser) =>
	user.t.mutation(api.outreach.reachMe.unlinkChannel, { channel: "telegram" });

describe("unlinkChannel", () => {
	it("revokes the link user_app, records consent revoked and says one goodbye", async () => {
		const { user } = await linked();
		const unlinkedAt = Date.now();
		await unlink(user);
		await processSoon(user.root);

		expect(await identities(user)).toEqual([
			expect.objectContaining({
				externalId: CHAT,
				revokedAt: unlinkedAt,
				revokedReason: "user_app",
				status: "revoked",
			}),
		]);
		expect((await consents(user)).map((c) => c.status)).toEqual([
			"granted",
			"revoked",
		]);
		expect(await telegramEntry(user)).toMatchObject({
			linked: false,
			revokedReason: "user_app",
			status: "disconnected",
		});
		expect(replies()).toEqual([GOODBYE_APP]);
		expect(sent("deleteMyCommands")[0]?.params).toEqual({
			scope: { chat_id: CHAT, type: "chat" },
		});
	});

	it("finds the live link behind more revoked chats than the read bound", async () => {
		const user = await asNewUser();
		backend(user.root);
		const secret = await configure(user.root);
		await setTelegram(user, { enabled: true, plan: "free" });
		// Eleven older chats, all unlinked inside the 30-day purge window.
		await user.root.run(async (ctx) => {
			for (let n = 1; n <= 11; n++) {
				await ctx.db.insert("channel_identities", {
					channel: "telegram",
					emotionalProfileId: user.profileId,
					externalId: `old-${n}`,
					linkedAt: Date.now(),
					revokedAt: Date.now(),
					revokedReason: "user_app",
					status: "revoked",
					tokenIdentifier: "test|old",
				});
			}
		});
		await linkChat(user, secret);
		forgetCalls();

		expect(await telegramEntry(user)).toMatchObject({ linked: true });
		await unlink(user);
		await processSoon(user.root);
		expect(replies()).toEqual([GOODBYE_APP]);
	});

	it("does nothing a second time, and refuses push", async () => {
		const { user } = await linked();
		await unlink(user);
		await unlink(user);
		await processSoon(user.root);
		expect(replies()).toEqual([GOODBYE_APP]);
		expect(await consents(user)).toHaveLength(2);
		await expectCode(
			() =>
				user.t.mutation(api.outreach.reachMe.unlinkChannel, {
					channel: "push",
				}),
			"channel_not_linkable"
		);
	});
});

const setPaused = (user: SeededUser, paused: boolean) =>
	user.t.mutation(api.outreach.reachMe.setChannelPaused, {
		channel: "telegram",
		paused,
	});

describe("setChannelPaused", () => {
	it("pauses and resumes without a message or a consent change", async () => {
		const { user } = await linked();
		await setPaused(user, true);
		expect(await telegramEntry(user)).toMatchObject({
			isFirst: false,
			linked: true,
			status: "paused",
		});
		await setPaused(user, false);
		expect(await telegramEntry(user)).toMatchObject({
			isFirst: true,
			linked: true,
			status: "linked",
		});
		await processSoon(user.root);
		expect(sent("sendMessage")).toEqual([]);
		expect(await consents(user)).toHaveLength(1);
	});

	it("refuses a channel with no live link", async () => {
		const { user } = await linked();
		await unlink(user);
		await expectCode(() => setPaused(user, true), "channel_not_linked");
	});
});

/** A text from the linked chat, through the webhook and the pool. */
async function say(user: SeededUser, secret: string, text: string) {
	await post(user.root, messageUpdate(STRANGER_CHAT, text), secret);
	await processSoon(user.root);
}

/** Telegram's `my_chat_member` for a private chat: the person blocked (or unblocked) the bot. */
let memberUpdateId = 9000;
function memberUpdate(status: "kicked" | "member") {
	memberUpdateId += 1;
	const person = { first_name: "Sam", id: STRANGER_CHAT, is_bot: false };
	const bot = { first_name: "Xolace", id: 1, is_bot: true };
	return {
		my_chat_member: {
			chat: { first_name: "Sam", id: STRANGER_CHAT, type: "private" },
			date: Math.floor(Date.now() / 1000),
			from: person,
			new_chat_member: { status, user: bot },
			old_chat_member: {
				status: status === "kicked" ? "member" : "kicked",
				user: bot,
			},
		},
		update_id: memberUpdateId,
	};
}

describe("/stop and /help", () => {
	it("/stop unlinks user_telegram and says how to link again", async () => {
		const { secret, user } = await linked();
		await say(user, secret, "/stop");
		expect(await identities(user)).toEqual([
			expect.objectContaining({
				revokedReason: "user_telegram",
				status: "revoked",
			}),
		]);
		expect((await consents(user)).map((c) => c.status)).toEqual([
			"granted",
			"revoked",
		]);
		expect(await telegramEntry(user)).toMatchObject({
			revokedReason: "user_telegram",
			status: "disconnected",
		});
		expect(replies()).toEqual([STOP_REPLY]);
		expect(sent("deleteMyCommands")).toHaveLength(1);
	});

	it("/help answers with the help line, paused too", async () => {
		const { secret, user } = await linked();
		await say(user, secret, "/help");
		await setPaused(user, true);
		await say(user, secret, "/help@xolace_dev_bot");
		expect(replies()).toEqual([HELP, HELP]);
		expect(await telegramEntry(user)).toMatchObject({ status: "paused" });
	});

	it("/stop works on a paused chat", async () => {
		const { secret, user } = await linked();
		await setPaused(user, true);
		await say(user, secret, "/stop");
		expect(await telegramEntry(user)).toMatchObject({
			revokedReason: "user_telegram",
			status: "disconnected",
		});
	});
});

describe("a revoked chat", () => {
	it("gets the how-to-link-again line once a day, whatever it sends", async () => {
		const { secret, user } = await linked();
		await say(user, secret, "/stop");
		forgetCalls();
		await say(user, secret, "hello?");
		await say(user, secret, "/stop");
		await say(user, secret, "/help");
		expect(replies()).toEqual([REVOKED_REPLY]);
		vi.advanceTimersByTime(24 * HOUR);
		await say(user, secret, "still there?");
		expect(replies()).toEqual([REVOKED_REPLY, REVOKED_REPLY]);
		expect(await consents(user)).toHaveLength(2);
	});
});

describe("blocks", () => {
	it("my_chat_member kicked revokes blocked, quietly; unblocking doesn't relink", async () => {
		const { secret, user } = await linked();
		await post(user.root, memberUpdate("kicked"), secret);
		await processSoon(user.root);
		expect(await telegramEntry(user)).toMatchObject({
			revokedReason: "blocked",
			status: "disconnected",
		});
		expect((await consents(user)).map((c) => c.status)).toEqual([
			"granted",
			"revoked",
		]);
		await post(user.root, memberUpdate("member"), secret);
		await processSoon(user.root);
		expect(await telegramEntry(user)).toMatchObject({ status: "disconnected" });
		expect(sent("sendMessage")).toEqual([]);
	});

	it("a 403 on any send revokes unreachable", async () => {
		const { secret, user } = await linked();
		blockChat(STRANGER_CHAT);
		await say(user, secret, "/help");
		expect(await telegramEntry(user)).toMatchObject({
			revokedReason: "unreachable",
			status: "disconnected",
		});
		expect((await consents(user)).map((c) => c.status)).toEqual([
			"granted",
			"revoked",
		]);
	});
});

describe("the 30-day purge", () => {
	it("deletes revoked rows 30 days after revokedAt, then the chat is a stranger", async () => {
		const { secret, user } = await linked();
		const unlinkedAt = Date.now();
		await unlink(user);
		await processSoon(user.root);
		vi.setSystemTime(unlinkedAt + REVOKED_RETENTION_MS - 1);
		await user.root.mutation(
			internal.outreach.telegram.lifecycle.purgeRevoked,
			{}
		);
		expect(await identities(user)).toHaveLength(1);
		vi.setSystemTime(unlinkedAt + REVOKED_RETENTION_MS);
		await user.root.mutation(
			internal.outreach.telegram.lifecycle.purgeRevoked,
			{}
		);
		expect(await identities(user)).toEqual([]);
		expect(await telegramEntry(user)).toMatchObject({ status: "not_linked" });
		forgetCalls();
		await say(user, secret, "hi");
		expect(replies()).toEqual([STRANGER_REPLY]);
	});
});

const OTHER_CHAT = 5_151_515_151;

describe("relinks", () => {
	it("reactivates the same row after an unlink, and listChannels shows linked again", async () => {
		const { secret, user } = await linked();
		const [before] = await identities(user);
		await unlink(user);
		await processSoon(user.root);
		forgetCalls();
		await linkChat(user, secret);
		const after = await identities(user);
		expect(after).toEqual([
			expect.objectContaining({
				_id: before?._id,
				status: "active",
			}),
		]);
		expect(after[0]?.revokedAt).toBeUndefined();
		expect(after[0]?.revokedReason).toBeUndefined();
		expect(await telegramEntry(user)).toMatchObject({
			isFirst: true,
			status: "linked",
		});
		expect(replies()).toEqual([WELCOME]);
		expect((await consents(user)).map((c) => c.status)).toEqual([
			"granted",
			"revoked",
			"granted",
		]);
	});

	it("same account, new chat: the old chat is revoked relinked and told", async () => {
		const { secret, user } = await linked();
		await linkChat(user, secret, OTHER_CHAT);
		const rows = await identities(user);
		expect(rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					externalId: CHAT,
					revokedReason: "relinked",
					status: "revoked",
				}),
				expect.objectContaining({
					externalId: String(OTHER_CHAT),
					status: "active",
				}),
			])
		);
		expect(await telegramEntry(user)).toMatchObject({ status: "linked" });
		expect(
			sent("sendMessage").map((c) => [c.params.chat_id, c.params.text])
		).toEqual([
			[String(OTHER_CHAT), WELCOME],
			[CHAT, OLD_CHAT],
		]);
		expect(sent("deleteMyCommands")[0]?.params).toEqual({
			scope: { chat_id: CHAT, type: "chat" },
		});
		expect((await consents(user)).map((c) => c.status)).toEqual([
			"granted",
			"revoked",
			"granted",
		]);
	});

	it("same chat, second account: the row moves, the old account is revoked relinked", async () => {
		const { secret, user: first } = await linked();
		const [row] = await identities(first);
		const second = await asNewUser(2, first.root);
		await linkChat(second, secret);

		expect(await identities(second)).toEqual([
			expect.objectContaining({
				_id: row?._id,
				emotionalProfileId: second.profileId,
				status: "active",
			}),
		]);
		expect(await identities(first)).toEqual([]);
		expect(await telegramEntry(first)).toMatchObject({
			linked: false,
			status: "not_linked",
		});
		expect(await telegramEntry(second)).toMatchObject({ status: "linked" });
		expect((await consents(first)).map((c) => c.status)).toEqual([
			"granted",
			"revoked",
		]);
		expect((await consents(second)).map((c) => c.status)).toEqual(["granted"]);
		expect(replies()).toEqual([RELINKED]);
		expect(sent("setMyCommands")[0]?.params).toEqual({
			commands: [...LINKED_COMMANDS],
			scope: { chat_id: CHAT, type: "chat" },
		});
	});
});
