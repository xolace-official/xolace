// @vitest-environment edge-runtime
/**
 * #766: linking a Telegram chat to a Xolace account. Minting through the
 * real authed action, `/start <token>` through the real webhook route and
 * the `telegramInbound` pool, verified on the recorded Bot API calls and the
 * public `listChannels`. What can go wrong: a token is stored or kept in
 * clear; an older token still links after a new one is minted; a bad,
 * expired, used or repeated token changes anything; a good one leaves
 * consent, the channel order or gentle return behind; a deployment with no
 * bot offers Telegram.
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../../_generated/api";
import { expectCode } from "../../test/fixtures.helpers";
import {
	asAdmin,
	asNewUser,
	type SeededUser,
} from "../../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../../test/mocks.helpers";
import { sha256Hex } from "./botApi";
import { EXPIRED_LINK_REPLY, LINKED_COMMANDS, WELCOME } from "./copy";
import {
	backend,
	configure,
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

const h = vi.hoisted(() => ({ plus: false }));

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../revenuecat", () => revenuecatMock(() => h.plus));

stubTelegramEachTest();

const LINK = /^https:\/\/t\.me\/xolace_dev_bot\?start=([A-Za-z0-9_-]{43})$/;

/** A signed-in user on a deployment with a bot, Telegram switched on. */
async function linkable(plan: "free" | "plus" = "free") {
	h.plus = false;
	const user = await asNewUser();
	backend(user.root);
	const secret = await configure(user.root);
	await setTelegram(user, { enabled: true, plan });
	forgetCalls();
	return { secret, user };
}

const setTelegram = (
	user: SeededUser,
	config: { enabled: boolean; plan: "free" | "plus" }
) =>
	asAdmin(9, user.root).mutation(api.admin.outreachChannels.setChannelConfig, {
		channel: "telegram",
		...config,
	});

const createLink = (user: SeededUser) =>
	user.t.action(api.outreach.telegram.link.createLink, {
		consentLanguageVersion: "telegram-1",
		regionCode: "gh",
	});

const tokenOf = (link: string) => {
	const token = LINK.exec(link)?.[1];
	if (!token) {
		throw new Error(`not a link: ${link}`);
	}
	return token;
};

/** `/start <token>` from a private chat, the way Telegram sends a deep link. */
function startUpdate(token: string, chatId = STRANGER_CHAT, username?: string) {
	const update = messageUpdate(chatId, `/start ${token}`);
	return {
		...update,
		message: {
			...update.message,
			from: { ...update.message.from, ...(username && { username }) },
		},
	};
}

async function start(
	user: SeededUser,
	secret: string,
	token: string,
	chatId = STRANGER_CHAT
) {
	await post(user.root, startUpdate(token, chatId, "sam_t"), secret);
	await processSoon(user.root);
}

const notifications = (user: SeededUser) =>
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

const identities = (user: SeededUser) =>
	user.root.run((ctx) => ctx.db.query("channel_identities").take(10));

const consents = (user: SeededUser) =>
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

const replies = () => sent("sendMessage").map((c) => c.params.text);

describe("createLink", () => {
	it("returns a t.me link and stores only the token's hash", async () => {
		const { user } = await linkable();
		const link = await createLink(user);
		const token = tokenOf(link);
		const rows = await user.root.run((ctx) =>
			ctx.db.query("channel_link_tokens").take(10)
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			channel: "telegram",
			consentLanguageVersion: "telegram-1",
			emotionalProfileId: user.profileId,
			expiresAt: Date.now() + 15 * 60_000,
			regionCode: "GH",
			tokenHash: await sha256Hex(token),
		});
		expect(JSON.stringify(rows)).not.toContain(token);
	});

	it("refuses with a typed error when Telegram isn't open to the user", async () => {
		const { user } = await linkable("plus");
		await expectCode(() => createLink(user), "telegram_unavailable");
		await setTelegram(user, { enabled: false, plan: "free" });
		await expectCode(() => createLink(user), "telegram_unavailable");
		await setTelegram(user, { enabled: true, plan: "free" });
		Reflect.deleteProperty(process.env, "TELEGRAM_BOT_TOKEN");
		await expectCode(() => createLink(user), "telegram_unavailable");
	});
});

describe("/start <token>", () => {
	it("links the chat, records consent, puts Telegram first, turns on gentle return and says welcome", async () => {
		const { secret, user } = await linkable();
		expect((await notifications(user))?.gentleReturn).toBe(false);
		const token = tokenOf(await createLink(user));
		const before = Date.now();
		await start(user, secret, token);

		const [identity] = await identities(user);
		expect(identity?.linkedAt).toBeGreaterThan(before);
		expect(identity?.linkedAt).toBeLessThanOrEqual(Date.now());
		expect(await identities(user)).toEqual([
			expect.objectContaining({
				channel: "telegram",
				country: "GH",
				displayHandle: "sam_t",
				emotionalProfileId: user.profileId,
				externalId: String(STRANGER_CHAT),
				status: "active",
				telegramUserId: String(STRANGER_CHAT),
			}),
		]);
		expect(await consents(user)).toEqual([
			expect.objectContaining({
				consentLanguageVersion: "telegram-1",
				status: "granted",
			}),
		]);
		const prefs = await notifications(user);
		expect(prefs?.channelOrder).toEqual(["telegram", "push"]);
		expect(prefs).toMatchObject({
			enabled: false,
			gentleReturn: true,
			patternNudge: false,
		});

		expect(sent("sendMessage")[0]?.params).toMatchObject({
			chat_id: String(STRANGER_CHAT),
			protect_content: true,
			text: WELCOME,
		});
		expect(sent("setMyCommands")[0]?.params).toEqual({
			commands: [...LINKED_COMMANDS],
			scope: { chat_id: String(STRANGER_CHAT), type: "chat" },
		});
	});

	it("keeps no token in clear, not even on the stored update", async () => {
		const { secret, user } = await linkable();
		const token = tokenOf(await createLink(user));
		await post(user.root, startUpdate(token), secret);
		expect(JSON.stringify(await events(user.root))).not.toContain(token);
		await processSoon(user.root);
		expect(JSON.stringify(await events(user.root))).not.toContain(token);
	});

	it("answers a bad, expired, used or repeated token with the expired line and changes nothing", async () => {
		const { secret, user } = await linkable();
		const older = tokenOf(await createLink(user));
		const newest = tokenOf(await createLink(user));
		// Inside its 15 minutes, but a newer mint retired it.
		await start(user, secret, older);
		expect(replies()).toEqual([EXPIRED_LINK_REPLY]);
		vi.advanceTimersByTime(15 * 60_000 + 1);
		await start(user, secret, newest);
		await start(user, secret, "not-a-token-at-all");
		await start(user, secret, older);
		expect(replies()).toEqual(Array(4).fill(EXPIRED_LINK_REPLY));
		expect(await identities(user)).toEqual([]);
		expect(await consents(user)).toEqual([]);
		expect((await notifications(user))?.channelOrder).toBeUndefined();

		const good = tokenOf(await createLink(user));
		await start(user, secret, good);
		forgetCalls();
		await start(user, secret, good);
		expect(replies()).toEqual([EXPIRED_LINK_REPLY]);
		expect(await consents(user)).toHaveLength(1);
	});

	it("is refused on the eleventh mint in an hour", async () => {
		const { user } = await linkable();
		for (let i = 0; i < 10; i++) {
			await createLink(user);
		}
		await expectCode(() => createLink(user), "rate_limited");
		vi.advanceTimersByTime(HOUR);
		await createLink(user);
	});
});

const listChannels = (user: SeededUser) =>
	user.t.query(api.outreach.reachMe.listChannels, {});

describe("listChannels", () => {
	it("shows the link as it happens and Telegram first after it", async () => {
		const { secret, user } = await linkable();
		expect(await listChannels(user)).toEqual([
			{
				available: true,
				channel: "push",
				isFirst: true,
				linked: true,
				requiresPlus: false,
				status: "linked",
			},
			{
				available: true,
				channel: "telegram",
				isFirst: false,
				linked: false,
				requiresPlus: false,
				status: "not_linked",
			},
		]);
		await start(user, secret, tokenOf(await createLink(user)));
		expect(await listChannels(user)).toEqual([
			{
				available: true,
				channel: "telegram",
				displayHandle: "sam_t",
				isFirst: true,
				linked: true,
				requiresPlus: false,
				status: "linked",
			},
			expect.objectContaining({ channel: "push", isFirst: false }),
		]);
	});

	it("shows needs_plus while Telegram is Plus-only and the user isn't, link kept", async () => {
		const { secret, user } = await linkable();
		await start(user, secret, tokenOf(await createLink(user)));
		await setTelegram(user, { enabled: true, plan: "plus" });
		const telegram = (await listChannels(user)).find(
			(c) => c.channel === "telegram"
		);
		expect(telegram).toMatchObject({
			available: false,
			linked: true,
			requiresPlus: true,
			status: "needs_plus",
		});
		h.plus = true;
		expect(
			(await listChannels(user)).find((c) => c.channel === "telegram")
		).toMatchObject({ available: true, status: "linked" });
	});

	it("omits Telegram on a deployment with no bot", async () => {
		const { user } = await linkable();
		Reflect.deleteProperty(process.env, "TELEGRAM_BOT_TOKEN");
		expect((await listChannels(user)).map((c) => c.channel)).toEqual(["push"]);
	});
});

describe("setFirstChannel and refreshCountry", () => {
	it("moves a channel to the front and refuses an unlinked Telegram", async () => {
		const { secret, user } = await linkable();
		await expectCode(
			() =>
				user.t.mutation(api.outreach.reachMe.setFirstChannel, {
					channel: "telegram",
				}),
			"channel_not_linked"
		);
		await start(user, secret, tokenOf(await createLink(user)));
		await user.t.mutation(api.outreach.reachMe.setFirstChannel, {
			channel: "push",
		});
		expect((await notifications(user))?.channelOrder).toEqual([
			"push",
			"telegram",
		]);
	});

	it("updates the linked chat's country from the device region", async () => {
		const { secret, user } = await linkable();
		await start(user, secret, tokenOf(await createLink(user)));
		await user.t.mutation(api.outreach.reachMe.refreshCountry, {
			regionCode: "us",
		});
		expect((await identities(user))[0]?.country).toBe("US");
		await user.t.mutation(api.outreach.reachMe.refreshCountry, {
			regionCode: "not a region",
		});
		expect((await identities(user))[0]?.country).toBe("US");
	});
});

describe("bad links from one chat", () => {
	it("get the expired line five times an hour, then nothing", async () => {
		const { secret, user } = await linkable();
		for (let i = 0; i < 7; i++) {
			await start(user, secret, `bad-${i}`);
		}
		expect(replies()).toEqual(Array(5).fill(EXPIRED_LINK_REPLY));
		vi.advanceTimersByTime(HOUR);
		await start(user, secret, "bad-again");
		expect(replies()).toHaveLength(6);
	});

	it("never keep extra words after the token in clear either", async () => {
		const { secret, user } = await linkable();
		const token = tokenOf(await createLink(user));
		await post(
			user.root,
			messageUpdate(STRANGER_CHAT, `/start ${token} please`),
			secret
		);
		expect(JSON.stringify(await events(user.root))).not.toContain(token);
	});
});
