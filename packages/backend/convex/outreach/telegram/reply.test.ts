// @vitest-environment edge-runtime
/**
 * #770: AI replies to Telegram taps and free text, through the real webhook,
 * the inbound pool, the safeguard and the reply writer, with the model and
 * moderation stubbed. What can go wrong: a reply without `protect_content`;
 * elevated text or a safeguard outage without Support resources; a crisis
 * text answered by the model; a text other than the first safe one inside a
 * Lighter's window saved as what helped; a reply that writes into sessions,
 * memory or Understanding; a model failure that sends nothing.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import {
	EMPTY_CATEGORIES,
	MODERATION_UNAVAILABLE,
	type ModerationResult,
} from "../../ai/providers/moderation";
import { seedSession } from "../../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../../test/mocks.helpers";
import { appLink } from "./appLinks";
import type { Keyboard } from "./checkIn";
import {
	ANSWER_BUTTONS,
	OPEN_XOLACE_BUTTON,
	REPLY_FAILED,
	SUPPORT_RESOURCES_BUTTON,
} from "./copy";
import { REFLECTION_WINDOW_MS } from "./reply";
import {
	backend,
	configure,
	forgetCalls,
	identities,
	linkChat,
	messageUpdate,
	post,
	processSoon,
	STRANGER_CHAT,
	sent,
	setTelegram,
	stubTelegramEachTest,
} from "./telegram.helpers";

/** The model and moderation, as the code under test sees them. */
const stub = vi.hoisted(() => ({
	/** Every reply-writer call: its system prompt and turn. */
	asked: [] as { system: string; user: string }[],
	/** Runs while the reply is being written, as another transaction would. */
	duringReply: undefined as (() => Promise<unknown>) | undefined,
	/** Reading the memory preload throws. */
	memoryFails: false,
	moderation: null as unknown,
	/** What the reply writer answers next, then `reply`. */
	queue: [] as (string | Error)[],
	reply: "Thanks for telling me.\nWhat's been on your mind?" as string | Error,
}));

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../revenuecat", () => revenuecatMock(() => false));
vi.mock("../../lib/pushNotifications", () => ({
	sendPushToProfile: async () => undefined,
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
vi.mock("../../talk/remember", async (orig) => {
	const real = await orig<typeof import("../../talk/remember")>();
	return {
		...real,
		talkPreload: (...args: Parameters<typeof real.talkPreload>) => {
			if (stub.memoryFails) {
				throw new Error("memory read failed");
			}
			return real.talkPreload(...args);
		},
	};
});
vi.mock("../../ai/providers/moderation", async (orig) => ({
	...(await orig<typeof import("../../ai/providers/moderation")>()),
	moderateInput: async () => stub.moderation,
}));
vi.mock("../../ai/providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../../ai/providers/anthropic")>()),
	getAnthropicClient: () => ({
		messages: {
			create: async (body: {
				messages: { content: string }[];
				system: string;
			}) => {
				const isReply = body.system.includes("private Telegram chat");
				if (!isReply) {
					// The classifier: never valid JSON, so it falls back to UNCLASSIFIED.
					throw new Error("classifier down");
				}
				stub.asked.push({
					system: body.system,
					user: body.messages[0]?.content ?? "",
				});
				await stub.duringReply?.();
				const next = stub.queue.shift() ?? stub.reply;
				if (next instanceof Error) {
					throw next;
				}
				return {
					content: [{ text: next, type: "text" }],
					usage: { input_tokens: 0, output_tokens: 0 },
				};
			},
		},
	}),
}));

const CLEAN: ModerationResult = {
	categories: EMPTY_CATEGORIES,
	categoryScores: {},
	flagged: false,
};
/** A moderate self-harm signal: elevated, not crisis. */
const ELEVATED: ModerationResult = {
	categories: EMPTY_CATEGORIES,
	categoryScores: { "self-harm": 0.4 },
	flagged: false,
};

stubTelegramEachTest();
beforeEach(() => {
	stub.asked = [];
	stub.duringReply = undefined;
	stub.memoryFails = false;
	stub.moderation = CLEAN;
	stub.queue = [];
	stub.reply = "Thanks for telling me.\nWhat's been on your mind?";
});
afterEach(() => {
	vi.restoreAllMocks();
});

const CHECK_IN_MESSAGE_ID = 101;
const CARD_TEXT = "Work has been a lot since Tuesday's review at 9am.";

const buttonsOf = (call: { params: Record<string, unknown> } | undefined) =>
	(
		(call?.params.reply_markup as { inline_keyboard: Keyboard } | undefined)
			?.inline_keyboard ?? []
	).flat();

/** A linked chat with one check-in sent, and its answer buttons. */
async function checkedIn(card: Partial<Doc<"follow_up_cards">> = {}) {
	const user = await asNewUser();
	backend(user.root);
	const secret = await configure(user.root);
	await setTelegram(user, { enabled: true, plan: "free" });
	await linkChat(user, secret);
	const workflowId = "wf_reply_card" as WorkflowId;
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "completed",
	});
	const cardId = await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: CARD_TEXT,
			compoundingDomain: "work",
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			status: "pending",
			tier: "standard",
			workflowId,
			...card,
		})
	);
	forgetCalls();
	await user.root.mutation(internal.followUps.sendFollowUpNudge, {
		workflowId,
	});
	await processSoon(user.root);
	const buttons = buttonsOf(sent("sendMessage")[0]);
	forgetCalls();
	const tap = async (answer: keyof typeof ANSWER_BUTTONS) => {
		const data = buttons.find(
			(b) => b.text === ANSWER_BUTTONS[answer]
		)?.callback_data;
		await post(
			user.root,
			{
				callback_query: {
					chat_instance: "1",
					data,
					from: { first_name: "Sam", id: STRANGER_CHAT, is_bot: false },
					id: `cb_${answer}`,
					message: {
						chat: { id: STRANGER_CHAT, type: "private" },
						date: 0,
						message_id: CHECK_IN_MESSAGE_ID,
					},
				},
				update_id: 70_000 + Object.keys(ANSWER_BUTTONS).indexOf(answer),
			},
			secret
		);
		await processSoon(user.root);
	};
	const write = async (text: string) => {
		await post(user.root, messageUpdate(STRANGER_CHAT, text), secret);
		await processSoon(user.root);
	};
	return { cardId, sessionId, tap, user, write };
}

/** The messages sent, whole (the helper's `replies` is their texts). */
const sentMessages = () => sent("sendMessage");
const lastReply = () => sentMessages().at(-1);
const buttonTexts = () => buttonsOf(lastReply()).map((b) => b.text);

const responseOf = (user: SeededUser) =>
	user.root.run((ctx) => ctx.db.query("follow_up_responses").first());

describe("a reply to a tap", () => {
	it("replaces the fixed toast with an AI reply, protected, after typing", async () => {
		const { tap } = await checkedIn();

		await tap("lighter");

		expect(sent("sendChatAction")[0]?.params).toMatchObject({
			action: "typing",
		});
		expect(sentMessages()).toHaveLength(1);
		expect(lastReply()?.params).toMatchObject({
			protect_content: true,
			text: "Thanks for telling me.\nWhat's been on your mind?",
		});
		expect(buttonTexts()).toEqual([]);
		expect(stub.asked[0]?.user).toContain("They just tapped: lighter");
		expect(stub.asked[0]?.user).toContain(CARD_TEXT);
	});

	it("opens the 30-minute window after Lighter, and no other answer", async () => {
		const { cardId, tap, user } = await checkedIn();

		await tap("lighter");

		const [identity] = await identities(user);
		// The fake clock stands still while the tap is processed.
		expect(identity?.awaitingReflection?.cardId).toBe(cardId);
		expect(identity?.awaitingReflection?.until).toBeGreaterThan(
			Date.now() + REFLECTION_WINDOW_MS - 30_000
		);
	});

	it("carries Support resources and Open Xolace after Heavier, and leaves heavierChoice unset", async () => {
		const { tap, user } = await checkedIn();

		await tap("heavier");

		expect(lastReply()?.params.protect_content).toBe(true);
		expect(buttonsOf(lastReply())).toEqual([
			{ text: SUPPORT_RESOURCES_BUTTON, url: appLink("support") },
			{ text: OPEN_XOLACE_BUTTON, url: appLink("app") },
		]);
		expect((await responseOf(user))?.heavierChoice).toBeUndefined();
		const [identity] = await identities(user);
		expect(identity?.awaitingReflection).toBeUndefined();
	});

	it("is written in the person's Reach", async () => {
		const { tap, user } = await checkedIn();
		await user.root.run(async (ctx) => {
			const prefs = await ctx.db
				.query("preferences")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			if (prefs?.notifications) {
				await ctx.db.patch("preferences", prefs._id, {
					notifications: { ...prefs.notifications, reach: "quiet" },
				});
			}
		});

		await tap("still_here");

		expect(stub.asked[0]?.system).toContain("Quiet: exactly two short lines");
	});
});

describe("a reply to free text", () => {
	it("answers with the person's words and recent turns, protected, no buttons", async () => {
		const { write } = await checkedIn();

		await write("Long day, but I got through it");
		await write("Thanks");

		expect(sentMessages()).toHaveLength(2);
		expect(sentMessages().every((c) => c.params.protect_content === true)).toBe(
			true
		);
		expect(buttonTexts()).toEqual([]);
		expect(stub.asked[1]?.user).toContain(
			"Them: Long day, but I got through it"
		);
		expect(stub.asked[1]?.user).toContain(
			"You: Thanks for telling me.\nWhat's been on your mind?"
		);
	});

	it("adds Support resources at elevated", async () => {
		const { write } = await checkedIn();
		stub.moderation = ELEVATED;

		await write("Some days I don't see the point");

		expect(buttonTexts()).toEqual([SUPPORT_RESOURCES_BUTTON]);
		expect(stub.asked[0]?.system).toContain("A Support resources button");
	});

	it("adds Support resources when both safeguard providers fail", async () => {
		const { write } = await checkedIn();
		stub.moderation = MODERATION_UNAVAILABLE;

		await write("Just a normal day really");

		expect(stub.asked).toHaveLength(1);
		expect(buttonTexts()).toEqual([SUPPORT_RESOURCES_BUTTON]);
	});

	it("sends the fixed line with resources at crisis, and asks no model", async () => {
		const { write } = await checkedIn();

		await write("I want to end my life");

		expect(stub.asked).toHaveLength(0);
		expect(lastReply()?.params).toMatchObject({
			protect_content: true,
			text: REPLY_FAILED,
		});
		expect(buttonTexts()).toEqual([
			SUPPORT_RESOURCES_BUTTON,
			OPEN_XOLACE_BUTTON,
		]);
	});

	it("sends the fixed failure line and Open Xolace when the model fails", async () => {
		const { write } = await checkedIn();
		stub.reply = new Error("overloaded");

		await write("Long day");

		expect(lastReply()?.params).toMatchObject({
			protect_content: true,
			text: REPLY_FAILED,
		});
		expect(buttonTexts()).toEqual([OPEN_XOLACE_BUTTON]);
	});

	it("still sends the fixed line when something fails before the model", async () => {
		const { write } = await checkedIn();
		stub.memoryFails = true;
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		await write("Long day");

		expect(sentMessages()).toHaveLength(1);
		expect(lastReply()?.params.text).toBe(REPLY_FAILED);
		expect(buttonTexts()).toEqual([OPEN_XOLACE_BUTTON]);
	});

	it("keeps Support resources on the failure line when an elevated reply fails before the model", async () => {
		const { write } = await checkedIn();
		stub.moderation = ELEVATED;
		stub.memoryFails = true;
		vi.spyOn(console, "error").mockImplementation(() => undefined);

		await write("Some days I don't see the point");

		expect(lastReply()?.params.text).toBe(REPLY_FAILED);
		expect(buttonTexts()).toEqual([
			SUPPORT_RESOURCES_BUTTON,
			OPEN_XOLACE_BUTTON,
		]);
	});

	it("screens the whole message, not just what fits the prompt", async () => {
		const { write } = await checkedIn();

		await write(`${"Long day at work. ".repeat(150)}I want to end my life`);

		expect(stub.asked).toHaveLength(0);
		expect(lastReply()?.params.text).toBe(REPLY_FAILED);
		expect(buttonTexts()).toContain(SUPPORT_RESOURCES_BUTTON);
	});

	it("sends nothing when the link ends while the reply is written", async () => {
		const { user, write } = await checkedIn();
		stub.duringReply = () =>
			user.root.run(async (ctx) => {
				const [identity] = await ctx.db.query("channel_identities").take(1);
				if (identity) {
					await ctx.db.patch("channel_identities", identity._id, {
						revokedAt: Date.now(),
						revokedReason: "user_telegram",
						status: "revoked",
					});
				}
			});

		await write("Long day");

		expect(sentMessages()).toHaveLength(0);
		expect((await identities(user))[0]?.recentTurns).toBeUndefined();
	});

	it("sends nothing to a chat relinked while the reply is written", async () => {
		const { user, write } = await checkedIn();
		stub.duringReply = () =>
			user.root.run(async (ctx) => {
				const [identity] = await ctx.db.query("channel_identities").take(1);
				if (identity) {
					await ctx.db.patch("channel_identities", identity._id, {
						linkedAt: identity.linkedAt + 1,
					});
				}
			});

		await write("Long day");

		expect(sentMessages()).toHaveLength(0);
	});

	it("drops the recent turns a day later, with no further message", async () => {
		const { user, write } = await checkedIn();
		await write("Long day");
		expect((await identities(user))[0]?.recentTurns).toHaveLength(2);

		vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
		await user.root.finishInProgressScheduledFunctions();
		await processSoon(user.root);

		expect((await identities(user))[0]?.recentTurns).toBeUndefined();
	});

	it("tries once more when a reply breaks its shape, then fails", async () => {
		const { write } = await checkedIn();
		stub.queue = ["One line only."];

		await write("Long day");

		expect(stub.asked).toHaveLength(2);
		expect(lastReply()?.params.text).toBe(
			"Thanks for telling me.\nWhat's been on your mind?"
		);

		stub.queue = ["Work is hard.\nTell me more.", "Work again.\nMore?"];
		await write("Still long");
		expect(lastReply()?.params.text).toBe(REPLY_FAILED);
	});
});

describe("what helped, after Lighter", () => {
	it("saves only the first text inside the window, unshared", async () => {
		const { cardId, tap, user, write } = await checkedIn();
		await tap("lighter");

		await write("A walk at lunch helped");
		await write("And talking to my sister");

		expect(await responseOf(user)).toMatchObject({
			cardId,
			reflectionText: "A walk at lunch helped",
			shareRequested: false,
		});
		const [identity] = await identities(user);
		expect(identity?.awaitingReflection).toBeUndefined();
		// No reply says it was saved: it's the model's ordinary reply.
		expect(stub.asked[1]?.system).toContain(
			"Never say you saved, kept or noted anything"
		);
	});

	it("saves nothing once the window has passed", async () => {
		const { tap, user, write } = await checkedIn();
		await tap("lighter");

		vi.advanceTimersByTime(REFLECTION_WINDOW_MS + 60_000);
		await write("A walk helped");

		expect(await responseOf(user)).toBeNull();
	});

	it("saves nothing at elevated, and the window is spent", async () => {
		const { tap, user, write } = await checkedIn();
		await tap("lighter");

		stub.moderation = ELEVATED;
		await write("Nothing helps really");
		stub.moderation = CLEAN;
		await write("A walk helped");

		expect(await responseOf(user)).toBeNull();
	});

	it("saves nothing when the safeguard couldn't run", async () => {
		const { tap, user, write } = await checkedIn();
		await tap("lighter");
		stub.moderation = MODERATION_UNAVAILABLE;

		await write("A walk helped");

		expect(await responseOf(user)).toBeNull();
	});

	it("saves nothing without a Lighter first", async () => {
		const { tap, user, write } = await checkedIn();
		await tap("still_here");

		await write("A walk helped");

		expect(await responseOf(user)).toBeNull();
	});
});

describe("what a reply writes", () => {
	it("touches no session, memory or Understanding", async () => {
		const { tap, user, write } = await checkedIn();
		const snapshot = () =>
			user.root.run(async (ctx) => ({
				// Memory is written by scheduled jobs (the RAG embed, the
				// Reflection Agent): none may be queued.
				memoryJobs: (
					await ctx.db.system.query("_scheduled_functions").take(500)
				)
					.map((f) => f.name)
					.filter((name) =>
						/episodic|understanding|reflectionAgent|semantic|session/i.test(
							name
						)
					),
				semantic: await ctx.db.query("semantic_profiles").take(50),
				sessions: await ctx.db.query("sessions").take(50),
				understanding: await ctx.db.query("emotional_metadata").take(50),
			}));
		const before = await snapshot();

		await tap("lighter");
		await write("A walk helped");
		await write("Feeling better now");

		expect(await snapshot()).toEqual(before);
	});

	it("drops the recent turns when the link ends", async () => {
		const { user, write } = await checkedIn();
		await write("Long day");
		expect((await identities(user))[0]?.recentTurns).toHaveLength(2);

		await write("/stop");

		expect((await identities(user))[0]?.recentTurns).toBeUndefined();
	});
});
