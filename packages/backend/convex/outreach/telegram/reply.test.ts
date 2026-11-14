// @vitest-environment edge-runtime
/**
 * #770: AI replies to Telegram taps and free text, through the real webhook,
 * the inbound pool, the safeguard and the reply writer, with the model and
 * moderation stubbed. What can go wrong: a reply without `protect_content`;
 * elevated text or a safeguard outage without Support resources; a crisis
 * text answered by the model (its own path is #772, `crisis.test.ts`); a text other than the first safe one inside a
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
import { crisisContactsFor } from "../../lib/crisisResources";
import { seedSession } from "../../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../../test/mocks.helpers";
import { ESCALATION_HOLD_MS } from "../router";
import { appLink } from "./appLinks";
import { DAILY_REPLY_CAP } from "./caps";
import type { Keyboard } from "./checkIn";
import {
	ANSWER_BUTTONS,
	CAP_REPLY,
	CAP_UPSELL,
	crisisReply,
	GET_PLUS_BUTTON,
	MORE_SUPPORT_BUTTON,
	OPEN_XOLACE_BUTTON,
	REPLY_FAILED,
	SUPPORT_RESOURCES_BUTTON,
} from "./copy";
import { eraseTelegramChats } from "./erase";
import { REFLECTION_WINDOW_MS } from "./reply";
import {
	backend,
	beforeNext,
	configure,
	failNext,
	forgetCalls,
	HOUR,
	identities,
	lastSentMessageId,
	linkChat,
	messageUpdate,
	post,
	processFor,
	processSoon,
	SECOND,
	SITE_URL,
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
	/** Runs once while the next text is screened, as other work would. */
	duringScreen: undefined as (() => Promise<unknown>) | undefined,
	/** Reading the memory preload throws. */
	memoryFails: false,
	moderation: null as unknown,
	/** Whether the user has Xolace+. */
	plus: false,
	/** What the reply writer answers next, then `reply`. */
	queue: [] as (string | Error)[],
	reply: "Thanks for telling me.\nWhat's been on your mind?" as string | Error,
	/** How many texts the safeguard screened. */
	screened: 0,
}));

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../revenuecat", () => revenuecatMock(() => stub.plus));
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
	moderateInput: async () => {
		stub.screened += 1;
		const meanwhile = stub.duringScreen;
		stub.duringScreen = undefined;
		await meanwhile?.();
		return stub.moderation;
	},
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
	stub.plus = false;
	stub.queue = [];
	stub.screened = 0;
	stub.duringScreen = undefined;
	stub.reply = "Thanks for telling me.\nWhat's been on your mind?";
});
afterEach(() => {
	vi.restoreAllMocks();
});

const CHECK_IN_MESSAGE_ID = 101;
/** A second Telegram chat the same account links. */
const OTHER_CHAT = 5_151_515_151;
/** Fifty replies through the whole pipeline take a while. */
const PLUS_CAP_TIMEOUT_MS = 60_000;
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
	/** Sent, but only `ms` passes before the next thing happens. */
	const writeQuickly = async (text: string, ms: number) => {
		await post(user.root, messageUpdate(STRANGER_CHAT, text), secret);
		await processFor(user.root, ms);
	};
	/** Spend `n` of today's replies on ordinary texts. */
	const useReplies = async (n: number) => {
		for (let i = 0; i < n; i++) {
			await write(`Ordinary day ${i}`);
		}
	};
	return {
		cardId,
		secret,
		sessionId,
		tap,
		useReplies,
		user,
		write,
		writeQuickly,
	};
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

	it("sends the fixed crisis reply at crisis, and asks no model", async () => {
		const { write } = await checkedIn();

		await write("I want to end my life");

		expect(stub.asked).toHaveLength(0);
		expect(lastReply()?.params).toMatchObject({
			protect_content: true,
			text: crisisReply(crisisContactsFor("GH")),
		});
		expect(buttonTexts()).toEqual([MORE_SUPPORT_BUTTON, OPEN_XOLACE_BUTTON]);
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
		expect(lastReply()?.params.text).toBe(crisisReply(crisisContactsFor("GH")));
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

	it("sends and keeps nothing when a data wipe lands while the reply is written", async () => {
		const { user, write } = await checkedIn();
		stub.duringReply = () =>
			user.root.run((ctx) =>
				eraseTelegramChats(ctx, user.profileId, { accountDeleted: false })
			);

		await write("Long day");

		expect(sentMessages()).toHaveLength(0);
		expect((await identities(user))[0]?.recentTurns).toBeUndefined();
	});

	it("keeps no text and sends nothing when a data wipe lands while it is screened", async () => {
		const { user, write } = await checkedIn();
		stub.duringScreen = () =>
			user.root.run((ctx) =>
				eraseTelegramChats(ctx, user.profileId, { accountDeleted: false })
			);

		await write("Long day");

		expect(sentMessages()).toHaveLength(0);
		expect((await identities(user))[0]?.pendingBurst).toBeUndefined();
	});

	it("sends no reply to a tap a data wipe overtook after its claim", async () => {
		const { tap, user } = await checkedIn();
		beforeNext("answerCallbackQuery", async () => {
			await user.root.run((ctx) =>
				eraseTelegramChats(ctx, user.profileId, { accountDeleted: false })
			);
			// The reply starts a moment after the wipe, as it would for real.
			vi.advanceTimersByTime(SECOND);
		});

		await tap("lighter");

		expect(sentMessages().map((c) => c.params.text)).not.toContain(stub.reply);
	});

	it("sends no cap line to a tap a data wipe overtook", async () => {
		const { tap, useReplies, user } = await checkedIn();
		await useReplies(DAILY_REPLY_CAP.free);
		forgetCalls();
		beforeNext("answerCallbackQuery", async () => {
			await user.root.run((ctx) =>
				eraseTelegramChats(ctx, user.profileId, { accountDeleted: false })
			);
			vi.advanceTimersByTime(SECOND);
		});

		await tap("lighter");

		expect(sentMessages().map((c) => c.params.text)).not.toContain(CAP_UPSELL);
	});

	it("sends no failure line for a reply a data wipe overtook", async () => {
		const { user, write } = await checkedIn();
		stub.reply = new Error("overloaded");
		stub.duringReply = async () => {
			await user.root.run((ctx) =>
				eraseTelegramChats(ctx, user.profileId, { accountDeleted: false })
			);
			vi.advanceTimersByTime(SECOND);
		};

		await write("Long day");

		expect(sentMessages().map((c) => c.params.text)).not.toContain(
			REPLY_FAILED
		);
	});

	it("sends no failure line for a burst a data wipe overtook", async () => {
		const { user, writeQuickly } = await checkedIn();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		await writeQuickly("Long day", 2 * SECOND);
		stub.memoryFails = true;
		// The burst's typing comes after it was taken.
		beforeNext("sendChatAction", async () => {
			await user.root.run((ctx) =>
				eraseTelegramChats(ctx, user.profileId, { accountDeleted: false })
			);
			vi.advanceTimersByTime(SECOND);
		});

		await processSoon(user.root);

		expect(sentMessages().map((c) => c.params.text)).not.toContain(
			REPLY_FAILED
		);
	});

	it("keeps a crisis reply that a data wipe landed during", async () => {
		const { user, write } = await checkedIn();
		beforeNext("sendMessage", () =>
			user.root.run((ctx) =>
				eraseTelegramChats(ctx, user.profileId, { accountDeleted: false })
			)
		);

		await write("I want to end my life");

		expect(lastReply()?.params.text).toBe(crisisReply(crisisContactsFor("GH")));
		const deleted = sent("deleteMessages").flatMap(
			(c) => c.params.message_ids as number[]
		);
		expect(deleted).not.toContain(lastSentMessageId());
	});

	it("deletes a crisis reply whose send finished after account deletion", async () => {
		const { user, write } = await checkedIn();
		beforeNext("sendMessage", () =>
			user.root.run(async (ctx) => {
				await eraseTelegramChats(ctx, user.profileId, { accountDeleted: true });
				// Deletion's last step: the chat's row goes.
				for (const identity of await ctx.db
					.query("channel_identities")
					.withIndex("by_profile_channel", (q) =>
						q.eq("emotionalProfileId", user.profileId)
					)
					.collect()) {
					await ctx.db.delete("channel_identities", identity._id);
				}
			})
		);

		// The crisis reply is the next message sent; the final note follows it.
		const crisisId = lastSentMessageId() + 1;

		await write("I want to end my life");

		expect(sentMessages().map((c) => c.params.text)).toContain(
			crisisReply(crisisContactsFor("GH"))
		);
		const deleted = sent("deleteMessages").flatMap(
			(c) => c.params.message_ids as number[]
		);
		expect(deleted).toContain(crisisId);
	});

	it("deletes a reply whose send finished after a data wipe", async () => {
		const { user, write } = await checkedIn();
		beforeNext("sendMessage", () =>
			user.root.run((ctx) =>
				eraseTelegramChats(ctx, user.profileId, { accountDeleted: false })
			)
		);

		await write("Long day");

		const deleted = sent("deleteMessages").flatMap(
			(c) => c.params.message_ids as number[]
		);
		expect(deleted).toContain(lastSentMessageId());
		expect((await identities(user))[0]?.sentMessages).toBeUndefined();
	});

	it("sends no AI reply that was being written when a crisis came in", async () => {
		const { user, write } = await checkedIn();
		stub.duringReply = async () => {
			const [identity] = await identities(user);
			await user.root.mutation(internal.outreach.telegram.reply.recordCrisis, {
				identityId: identity._id,
				linkedAt: identity.linkedAt,
				trigger: {
					triggerConfidence: 0,
					triggerEvidence: "test",
					triggerType: "implicit_risk_language",
				},
			});
		};

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

describe("the daily reply cap", () => {
	it("gives a free user five replies, then the upsell with Get Xolace+ and Open Xolace", async () => {
		const { useReplies, write } = await checkedIn();
		await useReplies(DAILY_REPLY_CAP.free);
		expect(stub.asked).toHaveLength(DAILY_REPLY_CAP.free);

		await write("One more thing");

		expect(stub.asked).toHaveLength(DAILY_REPLY_CAP.free);
		expect(lastReply()?.params).toMatchObject({
			protect_content: true,
			text: CAP_UPSELL,
		});
		expect(buttonsOf(lastReply())).toEqual([
			{ text: GET_PLUS_BUTTON, url: appLink("plus") },
			{ text: OPEN_XOLACE_BUTTON, url: appLink("app") },
		]);
	});

	const struggling: [
		string,
		Partial<Doc<"follow_up_cards">>,
		(c: Awaited<ReturnType<typeof checkedIn>>) => Promise<void>,
	][] = [
		["an elevated card", { tier: "elevated" }, (c) => c.write("Still here")],
		["an acute card", { tier: "acute" }, (c) => c.write("Still here")],
		[
			"an escalation-derived card",
			{ escalationDerived: true },
			(c) => c.write("Still here"),
		],
		["a Heavier answer", {}, (c) => c.tap("heavier")],
		[
			"an elevated text this turn",
			{},
			(c) => {
				stub.moderation = ELEVATED;
				return c.write("Some days I don't see the point");
			},
		],
		[
			"a crisis in the last 72 h",
			{},
			async (c) => {
				await c.user.root.run((ctx) =>
					ctx.db.insert("escalation_events", {
						actionTaken: "crisis_line_presented",
						createdAt: Date.now() - (ESCALATION_HOLD_MS - HOUR),
						emotionalProfileId: c.user.profileId,
						resourcesPresented: [],
						reviewedByHuman: false,
						sessionId: c.sessionId,
						triggerConfidence: 0.9,
						triggerEvidence: "explicit_crisis_language",
						triggerType: "explicit_crisis_language",
					})
				);
				await c.write("Still here");
			},
		],
	];
	it.each(struggling)(
		"gives a free user with %s the plain line with Support resources, never the upsell",
		async (_name, card, last) => {
			const c = await checkedIn(card);
			await c.useReplies(DAILY_REPLY_CAP.free);

			await last(c);

			expect(lastReply()?.params.text).toBe(CAP_REPLY);
			expect(buttonTexts()).toEqual([
				SUPPORT_RESOURCES_BUTTON,
				OPEN_XOLACE_BUTTON,
			]);
		}
	);

	it("still offers the upsell when the only elevated card closed long ago", async () => {
		const longAgo = Date.now() - 30 * 24 * HOUR;
		const c = await checkedIn({
			createdAt: longAgo,
			resolvedAt: longAgo,
			status: "resolved",
			tier: "elevated",
			userResponse: "heavier",
		});
		await c.useReplies(DAILY_REPLY_CAP.free);

		await c.write("One more thing");

		expect(lastReply()?.params.text).toBe(CAP_UPSELL);
	});

	it("keeps Support resources on the cap line when the safeguard couldn't run", async () => {
		const { useReplies, write } = await checkedIn();
		await useReplies(DAILY_REPLY_CAP.free);
		stub.moderation = MODERATION_UNAVAILABLE;

		await write("One more thing");

		expect(lastReply()?.params.text).toBe(CAP_REPLY);
		expect(buttonTexts()).toContain(SUPPORT_RESOURCES_BUTTON);
	});

	it("counts every chat the account linked, not just this one", async () => {
		const { secret, useReplies, user } = await checkedIn();
		await useReplies(DAILY_REPLY_CAP.free);

		await linkChat(user, secret, OTHER_CHAT);
		forgetCalls();
		await post(user.root, messageUpdate(OTHER_CHAT, "New phone"), secret);
		await processSoon(user.root);

		expect(stub.asked).toHaveLength(DAILY_REPLY_CAP.free);
		expect(lastReply()?.params.text).toBe(CAP_UPSELL);
	});

	it("doesn't count a reply Telegram didn't take", async () => {
		const { useReplies, write } = await checkedIn();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		failNext("sendMessage", {
			description: "Internal Server Error",
			error_code: 500,
		});
		await write("Long day");
		expect(sentMessages()).toHaveLength(1);

		await useReplies(DAILY_REPLY_CAP.free);

		expect(stub.asked).toHaveLength(DAILY_REPLY_CAP.free + 1);
		expect(lastReply()?.params.text).toBe(stub.reply);
	});

	it("doesn't count a reply that failed before the model", async () => {
		const { useReplies, write } = await checkedIn();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		stub.memoryFails = true;
		await write("Long day");
		expect(lastReply()?.params.text).toBe(REPLY_FAILED);
		stub.memoryFails = false;

		await useReplies(DAILY_REPLY_CAP.free);

		expect(lastReply()?.params.text).toBe(stub.reply);
	});

	it("doesn't count a reply that failed before Telegram was asked", async () => {
		const { useReplies, write } = await checkedIn();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		stub.moderation = ELEVATED;
		// The reply's buttons can't be made once it's written.
		stub.duringReply = async () => {
			Reflect.deleteProperty(process.env, "CONVEX_SITE_URL");
		};
		await write("Some days I don't see the point");
		expect(lastReply()?.params.text).toBe(REPLY_FAILED);
		process.env.CONVEX_SITE_URL = SITE_URL;
		stub.moderation = CLEAN;

		await useReplies(DAILY_REPLY_CAP.free);

		expect(lastReply()?.params.text).toBe(stub.reply);
	});

	it("gives a slot back only to the day and account that took it", async () => {
		const { useReplies, user } = await checkedIn();
		await useReplies(2);
		const [identity] = await identities(user);

		await user.root.mutation(internal.outreach.telegram.reply.returnReplySlot, {
			day: "2026-11-12",
			emotionalProfileId: user.profileId,
			identityId: identity._id,
		});

		expect((await identities(user))[0]?.replyCount?.count).toBe(2);
	});

	it("doesn't count a reply the model failed to write", async () => {
		const { useReplies, write } = await checkedIn();
		stub.reply = new Error("overloaded");
		await write("Long day");
		expect(lastReply()?.params.text).toBe(REPLY_FAILED);
		stub.reply = "Thanks for telling me.\nWhat's been on your mind?";

		await useReplies(DAILY_REPLY_CAP.free);

		expect(lastReply()?.params.text).toBe(stub.reply);
	});

	it(
		"gives Plus fifty replies, then the plain line at the 51st",
		async () => {
			stub.plus = true;
			const { useReplies, write } = await checkedIn();
			await useReplies(DAILY_REPLY_CAP.plus);
			expect(stub.asked).toHaveLength(DAILY_REPLY_CAP.plus);

			await write("One more thing");

			expect(stub.asked).toHaveLength(DAILY_REPLY_CAP.plus);
			expect(lastReply()?.params.text).toBe(CAP_REPLY);
			expect(buttonTexts()).toEqual([OPEN_XOLACE_BUTTON]);
		},
		PLUS_CAP_TIMEOUT_MS
	);

	it("resets on the user's own day boundary, not UTC's", async () => {
		const { useReplies, user, write } = await checkedIn();
		await user.root.run(async (ctx) => {
			const prefs = await ctx.db
				.query("preferences")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			if (prefs?.notifications) {
				await ctx.db.patch("preferences", prefs._id, {
					// 12:00 UTC is 07:00 here; local midnight is 05:00 UTC.
					notifications: {
						...prefs.notifications,
						timezone: "America/New_York",
					},
				});
			}
		});
		await useReplies(DAILY_REPLY_CAP.free);

		// 00:30 UTC: a new day in UTC, still the same day in New York.
		vi.setSystemTime(Date.UTC(2026, 10, 14, 0, 30));
		await write("Late one");
		expect(lastReply()?.params.text).toBe(CAP_UPSELL);

		// 05:30 UTC: past midnight in New York.
		vi.setSystemTime(Date.UTC(2026, 10, 14, 5, 30));
		await write("Morning");
		expect(stub.asked).toHaveLength(DAILY_REPLY_CAP.free + 1);
		expect(lastReply()?.params.text).toBe(
			"Thanks for telling me.\nWhat's been on your mind?"
		);
	});
});

describe("a burst of texts", () => {
	it("gets one reply, after the last, to all of them; each was screened on arrival", async () => {
		const { writeQuickly, user } = await checkedIn();

		await writeQuickly("Long day", 2 * SECOND);
		await writeQuickly("Work again", 2 * SECOND);
		await writeQuickly("And then the bus broke down", 2 * SECOND);
		expect(stub.screened).toBe(3);
		expect(sent("sendChatAction").length).toBeGreaterThanOrEqual(3);
		// Four seconds after the last: still waiting.
		await processFor(user.root, 2 * SECOND);
		expect(sentMessages()).toHaveLength(0);

		await processSoon(user.root);

		expect(sentMessages()).toHaveLength(1);
		expect(stub.asked).toHaveLength(1);
		for (const text of ["Long day", "Work again", "bus broke down"]) {
			expect(stub.asked[0]?.user).toContain(text);
		}
	});

	it("waits for a text still being screened, and answers both at once", async () => {
		const { user, writeQuickly } = await checkedIn();

		await writeQuickly("Long day", 2 * SECOND);
		// The first text's reply falls due while the second is still screened.
		stub.duringScreen = async () => {
			const [identity] = await identities(user);
			const burst = identity?.pendingBurst;
			if (burst) {
				await user.root.action(internal.outreach.telegram.reply.answerBurst, {
					chatId: String(STRANGER_CHAT),
					dueAt: burst.dueAt,
					identityId: identity._id,
					linkedAt: burst.linkedAt,
				});
			}
		};
		await writeQuickly("Work again", SECOND);
		await processSoon(user.root);

		expect(sentMessages()).toHaveLength(1);
		expect(stub.asked).toHaveLength(1);
		expect(stub.asked[0]?.user).toContain("Long day");
		expect(stub.asked[0]?.user).toContain("Work again");
	});

	it("carries Support resources when any text in it was elevated", async () => {
		const { writeQuickly, user } = await checkedIn();

		stub.moderation = ELEVATED;
		await writeQuickly("Some days I don't see the point", 2 * SECOND);
		stub.moderation = CLEAN;
		await writeQuickly("Anyway", 2 * SECOND);
		await processSoon(user.root);

		expect(sentMessages()).toHaveLength(1);
		expect(buttonTexts()).toEqual([SUPPORT_RESOURCES_BUTTON]);
		expect(stub.asked[0]?.user).toContain("Anyway");
	});

	it("answers a crisis text at once, and drops the rest of the burst", async () => {
		const { writeQuickly, user } = await checkedIn();

		await writeQuickly("Long day", 2 * SECOND);
		await writeQuickly("I want to end my life", 2 * SECOND);
		// Within 2 s, well before the 6 s burst would have answered.
		expect(sentMessages()).toHaveLength(1);
		expect(lastReply()?.params.text).toBe(crisisReply(crisisContactsFor("GH")));

		await processSoon(user.root);

		expect(stub.asked).toHaveLength(0);
		expect(sentMessages()).toHaveLength(1);
		expect((await identities(user))[0]?.pendingBurst).toBeUndefined();
	});

	it("drops a waiting burst when the link ends", async () => {
		const { user, writeQuickly } = await checkedIn();

		await writeQuickly("Long day", 2 * SECOND);
		await writeQuickly("/stop", 2 * SECOND);
		forgetCalls();
		await processSoon(user.root);

		expect(stub.asked).toHaveLength(0);
		expect(sentMessages()).toHaveLength(0);
		expect((await identities(user))[0]?.pendingBurst).toBeUndefined();
	});
});
