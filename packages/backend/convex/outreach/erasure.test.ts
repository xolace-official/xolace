// @vitest-environment edge-runtime
/**
 * #773: what account deletion and a data wipe do to outreach and Telegram,
 * driven through the real jobs (`accountDeletion.purgeUser`, `dataWipe.wipe`)
 * and checked on the recorded Bot API calls and the outreach tables. What can
 * go wrong: a message we sent in the last 48 h stays in the chat; one older
 * than that keeps live buttons; a call names more than 100 ids; the deleted
 * account's note is missing, or a wipe sends one; a row the user's outreach
 * left behind survives deletion; a wipe ends the link or its consent.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, ragMock, revenuecatMock } from "../test/mocks.helpers";
import { drainInbound } from "./erasure";
import { ACCOUNT_DELETED, CHECK_IN_CLOSED } from "./telegram/copy";
import { eraseTelegramChats } from "./telegram/erase";
import {
	backend,
	beforeNext,
	botCalls,
	configure,
	consents,
	createLink,
	DAY,
	failNext,
	forgetCalls,
	HOUR,
	identities,
	lastSentMessageId,
	linkChat,
	messageUpdate,
	post,
	processSoon,
	STRANGER_CHAT,
	sent,
	setTelegram,
	stubTelegramEachTest,
} from "./telegram/telegram.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(() => false));
vi.mock("../rag", () => ragMock());
// Account deletion's push teardown: the component isn't registered in tests.
vi.mock("../lib/pushNotifications", async (orig) => ({
	...(await orig<typeof import("../lib/pushNotifications")>()),
	profilePushDevices: async () => [],
	pushNotifications: { removeToken: async () => null },
	sendPushToProfile: async () => {},
}));
vi.mock("@convex-dev/workflow", async (orig) => {
	const real = await orig<typeof import("@convex-dev/workflow")>();
	let n = 0;
	class WorkflowManager extends real.WorkflowManager {
		start = async () => `wf_started_${++n}` as never;
		cancel = async () => {};
	}
	return { ...real, WorkflowManager };
});

stubTelegramEachTest();

const CHAT = String(STRANGER_CHAT);
/** The stub numbers sent messages from 100: the welcome took it. */
const WELCOME_ID = 100;

async function linked() {
	const user = await asNewUser();
	backend(user.root);
	const secret = await configure(user.root);
	await setTelegram(user, { enabled: true, plan: "free" });
	await linkChat(user, secret);
	forgetCalls();
	return { secret, user };
}

let nextWorkflow = 0;
/** A follow-up whose nudge goes out as a live check-in. */
async function checkIn(user: SeededUser) {
	nextWorkflow += 1;
	const workflowId = `wf_erase_${nextWorkflow}` as WorkflowId;
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "completed",
	});
	await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: "Work has been a lot since Tuesday.",
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			status: "pending",
			tier: "standard",
			workflowId,
		})
	);
	await user.root.mutation(internal.followUps.sendFollowUpNudge, {
		workflowId,
	});
	await processSoon(user.root);
}

async function purge(user: SeededUser) {
	await user.root.run((ctx) =>
		ctx.db.patch("users", user.userId, { accountStatus: "purging" })
	);
	await user.root.mutation(internal.jobs.accountDeletion.purgeUser, {
		userId: user.userId,
	});
	await processSoon(user.root);
}

async function wipe(user: SeededUser) {
	await user.root.mutation(internal.jobs.dataWipe.wipe, {
		emotionalProfileId: user.profileId,
	});
	await processSoon(user.root);
}

const deletedIds = () =>
	sent("deleteMessages").flatMap((c) => {
		expect(c.params.chat_id).toBe(CHAT);
		return c.params.message_ids as number[];
	});

/** Every outreach row the user's outreach and chat left. */
const outreachRows = (user: SeededUser) =>
	user.root.run(async (ctx) => {
		const outreach = await ctx.db
			.query("outreach")
			.withIndex("by_profile_created", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.take(50);
		const deliveries: Doc<"outreach_deliveries">[] = [];
		for (const row of await ctx.db.query("outreach_deliveries").take(50)) {
			deliveries.push(row);
		}
		return {
			deliveries,
			identities: await ctx.db
				.query("channel_identities")
				.withIndex("by_profile_channel", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.take(10),
			inbound: await ctx.db.query("inbound_events").take(50),
			outreach,
			tokens: await ctx.db
				.query("channel_link_tokens")
				.withIndex("by_profile_channel", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.take(10),
		};
	});

describe("account deletion", () => {
	it("deletes our last 48 h of messages, collapses an older check-in, says goodbye and leaves no outreach rows", async () => {
		const { secret, user } = await linked();
		// An old check-in: past Telegram's 48 h, so collapsed, not deleted.
		await checkIn(user);
		const oldCheckIn = WELCOME_ID + 1;
		vi.advanceTimersByTime(2 * DAY + HOUR);
		// A reply inside the window: deletable.
		await post(user.root, messageUpdate(STRANGER_CHAT, "/help"), secret);
		await processSoon(user.root);
		forgetCalls();

		await purge(user);

		// The /help line; never the welcome or the old check-in.
		expect(deletedIds()).toEqual([WELCOME_ID + 2]);
		expect(
			sent("editMessageText").map((c) => [c.params.message_id, c.params.text])
		).toEqual([[oldCheckIn, CHECK_IN_CLOSED]]);
		// One note, after every delete, so nothing deletes it.
		const calls = botCalls().map((c) => c.method);
		const note = botCalls().findIndex(
			(c) => c.method === "sendMessage" && c.params.text === ACCOUNT_DELETED
		);
		expect(sent("sendMessage").map((c) => c.params)).toEqual([
			{ chat_id: CHAT, protect_content: true, text: ACCOUNT_DELETED },
		]);
		expect(note).toBeGreaterThan(calls.lastIndexOf("deleteMessages"));
		expect(await outreachRows(user)).toEqual({
			deliveries: [],
			identities: [],
			inbound: [],
			outreach: [],
			tokens: [],
		});
	});

	it("names at most 100 ids per deleteMessages call", async () => {
		const { user } = await linked();
		const ids = Array.from({ length: 150 }, (_, i) => 1000 + i);
		await user.root.run(async (ctx) => {
			const [identity] = await ctx.db.query("channel_identities").take(1);
			await ctx.db.patch("channel_identities", identity._id, {
				sentMessages: ids.map((id) => ({ at: Date.now(), id: String(id) })),
			});
		});

		await purge(user);

		const perCall = sent("deleteMessages").map(
			(c) => (c.params.message_ids as number[]).length
		);
		expect(Math.max(...perCall)).toBeLessThanOrEqual(100);
		expect(deletedIds()).toEqual(expect.arrayContaining(ids));
	});

	it("tries a batch again when Telegram fails it for a passing reason", async () => {
		const { user } = await linked();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		failNext("deleteMessages", {
			description: "Internal Server Error",
			error_code: 500,
		});

		await purge(user);

		expect(deletedIds()).toEqual([WELCOME_ID, WELCOME_ID]);
		expect(sent("sendMessage").map((c) => c.params.text)).toEqual([
			ACCOUNT_DELETED,
		]);
	});

	it("erases every chat the account linked, past the first ten", async () => {
		const { user } = await linked();
		const chats = Array.from({ length: 12 }, (_, i) => String(9_000_000 + i));
		await addChats(user, chats);

		await purge(user);

		const erased = new Set(sent("deleteMessages").map((c) => c.params.chat_id));
		for (const chatId of chats) {
			expect(erased).toContain(chatId);
		}
	});

	it("gives each chat its own tries, after another chat used them all", async () => {
		const { user } = await linked();
		await addChats(user, ["9100001"]);
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		const serverError = {
			description: "Internal Server Error",
			error_code: 500,
		};
		// Three for the first chat, all its tries; one for the next.
		for (let i = 0; i < 4; i++) {
			failNext("deleteMessages", serverError);
		}

		await purge(user);

		const tries = (chatId: string) =>
			sent("deleteMessages").filter((c) => c.params.chat_id === chatId).length;
		const [first, second] = [
			...new Set(sent("deleteMessages").map((c) => String(c.params.chat_id))),
		];
		expect(tries(String(first))).toBe(3);
		expect(tries(String(second))).toBe(2);
	});

	it("deletes a check-in whose send finished after its chat was cleared", async () => {
		const { user } = await linked();
		beforeNext("sendMessage", () =>
			user.root.run(async (ctx) => {
				await eraseTelegramChats(ctx, user.profileId, {
					accountDeleted: false,
				});
				for (const delivery of await ctx.db
					.query("outreach_deliveries")
					.take(10)) {
					await ctx.db.delete("outreach_deliveries", delivery._id);
				}
			})
		);

		await checkIn(user);

		const deleted = sent("deleteMessages").flatMap(
			(c) => c.params.message_ids as number[]
		);
		expect(deleted).toContain(lastSentMessageId());
	});

	it("deletes a check-in whose chat account deletion removed while it was sent", async () => {
		const { user } = await linked();
		beforeNext("sendMessage", () =>
			user.root.run(async (ctx) => {
				for (const row of await ctx.db.query("channel_identities").take(10)) {
					await ctx.db.delete("channel_identities", row._id);
				}
				for (const delivery of await ctx.db
					.query("outreach_deliveries")
					.take(10)) {
					await ctx.db.delete("outreach_deliveries", delivery._id);
				}
			})
		);

		await checkIn(user);

		const deleted = sent("deleteMessages").flatMap(
			(c) => c.params.message_ids as number[]
		);
		expect(deleted).toContain(lastSentMessageId());
	});

	it("sends no note to a chat it already unlinked", async () => {
		const { user } = await linked();
		await user.root.run(async (ctx) => {
			const [identity] = await ctx.db.query("channel_identities").take(1);
			await ctx.db.patch("channel_identities", identity._id, {
				revokedAt: Date.now(),
				revokedReason: "user_app",
				status: "revoked",
			});
		});
		forgetCalls();

		await purge(user);

		expect(sent("sendMessage")).toEqual([]);
		expect((await outreachRows(user)).identities).toEqual([]);
	});
});

/** Old chats this account linked once: revoked, each with one recent message. */
async function addChats(user: SeededUser, chats: readonly string[]) {
	await user.root.run(async (ctx) => {
		for (const [i, chatId] of chats.entries()) {
			await ctx.db.insert("channel_identities", {
				channel: "telegram",
				emotionalProfileId: user.profileId,
				externalId: chatId,
				linkedAt: Date.now(),
				revokedAt: Date.now(),
				revokedReason: "relinked",
				sentMessages: [{ at: Date.now(), id: String(5000 + i) }],
				status: "revoked",
				tokenIdentifier: "test|old",
			});
		}
	});
}

describe("data wipe", () => {
	it("deletes at most 500 updates a pass, and still finishes", async () => {
		const { user } = await linked();
		const chats = Array.from({ length: 6 }, (_, i) => String(7_000_000 + i));
		await addChats(user, chats);
		await user.root.run(async (ctx) => {
			for (const chatId of chats) {
				for (let n = 0; n < 100; n++) {
					await ctx.db.insert("inbound_events", {
						channel: "telegram",
						externalId: chatId,
						payload: {},
						providerEventId: `${chatId}_${n}`,
						receivedAt: Date.now(),
						status: "processed",
					});
				}
			}
		});
		const left = () =>
			user.root.run(
				async (ctx) => (await ctx.db.query("inbound_events").take(1000)).length
			);

		let more = true;
		let passes = 0;
		while (more && passes < 5) {
			const before = await left();
			more = await user.root.run((ctx) => drainInbound(ctx, user.profileId));
			expect(before - (await left())).toBeLessThanOrEqual(500);
			passes += 1;
		}

		expect(more).toBe(false);
		expect(passes).toBeGreaterThan(1);
		expect(await left()).toBe(0);
	});

	it("finishes with a hundred chats or more, reaching the last one's updates", async () => {
		const { user } = await linked();
		const chats = Array.from({ length: 100 }, (_, i) => String(8_000_000 + i));
		await addChats(user, chats);
		const last = chats.at(-1) ?? "";
		await user.root.run((ctx) =>
			ctx.db.insert("inbound_events", {
				channel: "telegram",
				externalId: last,
				payload: {},
				providerEventId: "1",
				receivedAt: Date.now(),
				status: "processed",
			})
		);

		let more = true;
		for (let pass = 0; pass < 5 && more; pass++) {
			more = await user.root.run((ctx) => drainInbound(ctx, user.profileId));
		}

		expect(more).toBe(false);
		expect((await outreachRows(user)).inbound).toEqual([]);
	});

	it("keeps the link and its consent, clears history and the reflection window, and sends no note", async () => {
		const { secret, user } = await linked();
		await checkIn(user);
		await post(user.root, messageUpdate(STRANGER_CHAT, "/help"), secret);
		await processSoon(user.root);
		await createLink(user); // an unused token
		await user.root.run(async (ctx) => {
			const [identity] = await ctx.db.query("channel_identities").take(1);
			const [card] = await ctx.db.query("follow_up_cards").take(1);
			await ctx.db.patch("channel_identities", identity._id, {
				awaitingReflection: { cardId: card._id, until: Date.now() + HOUR },
				recentTurns: [{ at: Date.now(), role: "person", text: "long day" }],
			});
		});
		const consentBefore = await consents(user);
		forgetCalls();

		await wipe(user);

		// The welcome, the check-in and the /help line: all inside 48 h.
		expect(deletedIds()).toEqual([WELCOME_ID, WELCOME_ID + 1, WELCOME_ID + 2]);
		expect(sent("sendMessage")).toEqual([]);
		const [identity] = await identities(user);
		expect(identity).toMatchObject({ externalId: CHAT, status: "active" });
		expect(identity.awaitingReflection).toBeUndefined();
		expect(identity.recentTurns).toBeUndefined();
		expect(await consents(user)).toEqual(consentBefore);
		const rows = await outreachRows(user);
		expect(rows.outreach).toEqual([]);
		expect(rows.deliveries).toEqual([]);
		expect(rows.inbound).toEqual([]);
		// The used token stays: it's the record of the link that still stands.
		expect(rows.tokens.map((t) => t.usedAt !== undefined)).toEqual([true]);
	});
});
