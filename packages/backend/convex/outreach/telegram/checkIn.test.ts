// @vitest-environment edge-runtime
/**
 * #768: follow-up check-ins on Telegram, end to end: the outreach layer
 * routes a nudge, the Telegram adapter sends it on its own pool, a reveal tap
 * edits it, and closing the follow-up or the link collapses it. Verified on
 * the recorded Bot API calls. What can go wrong: the card text, its domain, a
 * day or a time reaches the first line (the lock screen); acute offers
 * Heavier; the reveal sends a new message; a closed follow-up or an ended link
 * leaves live buttons behind; a 403 keeps the link or falls back twice; a 429
 * falls back instead of retrying; the daily cap blocks an acute nudge.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
	ACUTE_NUDGE_BODY,
	fallbackFollowUpCard,
} from "../../ai/prompts/followUpCardWriter";
import { seedSession } from "../../test/fixtures.helpers";
import type { SeededUser } from "../../test/harness.helpers";
import { asNewUser } from "../../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../../test/mocks.helpers";
import { appLink } from "./appLinks";
import {
	ALREADY_ANSWERED_TOAST,
	ANSWER_BUTTONS,
	CHECK_IN_CLOSED,
	CHECK_IN_CLOSED_TOAST,
	CHECKED_IN,
	OPEN_XOLACE_BUTTON,
	REVEAL_BUTTON,
	SUPPORT_RESOURCES_BUTTON,
} from "./copy";
import {
	backend,
	blockChat,
	botCalls,
	configure,
	events,
	failNext,
	forgetCalls,
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

const h = vi.hoisted(() => ({ pushes: [] as unknown[] }));

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../revenuecat", () => revenuecatMock(() => false));
vi.mock("../../lib/pushNotifications", () => ({
	sendPushToProfile: async (_ctx: unknown, args: unknown) => {
		h.pushes.push(args);
	},
}));
// Supersession starts a workflow; only start and cancel are faked.
vi.mock("@convex-dev/workflow", async (orig) => {
	const real = await orig<typeof import("@convex-dev/workflow")>();
	let n = 0;
	class WorkflowManager extends real.WorkflowManager {
		start = async () => `wf_started_${++n}` as never;
		cancel = async () => {};
	}
	return { ...real, WorkflowManager };
});

// A tap's AI reply (#770) is reply.test.ts's subject; here it's fixed.
vi.mock("../../ai/telegram/reply", () => ({
	writeReply: async () => "Thanks for checking in.\nHow's the rest of today?",
}));

stubTelegramEachTest();
afterEach(() => {
	h.pushes.length = 0;
});

const CHAT = String(STRANGER_CHAT);
/** The stub numbers sent messages from 100; the welcome took it. */
const FIRST_MESSAGE_ID = 101;
const CARD_TEXT = "Work has been a lot since Tuesday's review at 9am.";

/** A user with a linked chat (Telegram first), push switched on too. */
async function linked() {
	const user = await asNewUser();
	backend(user.root);
	const secret = await configure(user.root);
	await setTelegram(user, { enabled: true, plan: "free" });
	await linkChat(user, secret);
	await setNotifications(user, { enabled: true });
	forgetCalls();
	return { secret, user };
}

const setNotifications = (
	user: SeededUser,
	notifications: Partial<Doc<"preferences">["notifications"]>
) =>
	user.root.run(async (ctx) => {
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		if (prefs) {
			await ctx.db.patch("preferences", prefs._id, {
				notifications: { ...prefs.notifications, ...notifications },
			});
		}
	});

let nextWorkflow = 0;
async function seedCard(
	user: SeededUser,
	card: Partial<Doc<"follow_up_cards">> = {}
) {
	nextWorkflow += 1;
	const workflowId = `wf_card_${nextWorkflow}` as WorkflowId;
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "completed",
	});
	const cardId = await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: CARD_TEXT,
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
	return { cardId, sessionId, workflowId };
}

/** The card's workflow nudges, and the delivery runs. */
async function nudge(user: SeededUser, workflowId: WorkflowId) {
	await user.root.mutation(internal.followUps.sendFollowUpNudge, {
		workflowId,
	});
	await processSoon(user.root);
}

const deliveries = (user: SeededUser) =>
	user.root.run((ctx) => ctx.db.query("outreach_deliveries").take(50));

type Keyboard = { callback_data?: string; text: string; url?: string }[][];
const keyboardOf = (call: { params: Record<string, unknown> } | undefined) =>
	(call?.params.reply_markup as { inline_keyboard: Keyboard } | undefined)
		?.inline_keyboard;

let nextUpdate = 50_000;
function tapUpdate(data: string, messageId: number) {
	nextUpdate += 1;
	return {
		callback_query: {
			chat_instance: "1",
			data,
			from: { first_name: "Sam", id: STRANGER_CHAT, is_bot: false },
			id: `cb_${nextUpdate}`,
			message: {
				chat: { id: STRANGER_CHAT, type: "private" },
				date: 0,
				message_id: messageId,
			},
		},
		update_id: nextUpdate,
	};
}

/** The one check-in sent, its message id and its reveal button's data. */
function theCheckIn() {
	const [call] = sent("sendMessage");
	const reveal = keyboardOf(call)
		?.flat()
		.find((b) => b.text === REVEAL_BUTTON)?.callback_data;
	return { call, messageId: FIRST_MESSAGE_ID, reveal: reveal ?? "" };
}

const collapsedTo = () =>
	sent("editMessageText").map((c) => ({
		buttons: keyboardOf(c)?.flat().length,
		text: c.params.text,
	}));

describe("a follow-up nudge on a linked chat", () => {
	it("sends one check-in with the tier's general line and three answers", async () => {
		const { user } = await linked();
		const { workflowId } = await seedCard(user);

		await nudge(user, workflowId);

		const sends = sent("sendMessage");
		expect(sends).toHaveLength(1);
		const { call } = theCheckIn();
		expect(call?.params).toMatchObject({
			chat_id: CHAT,
			protect_content: true,
			text: fallbackFollowUpCard("standard"),
		});
		expect(call?.params.disable_notification).toBeUndefined();
		expect(String(call?.params.text)).not.toContain("Work");
		const rows = keyboardOf(call) ?? [];
		expect(rows.map((r) => r.map((b) => b.text))).toEqual([
			[
				ANSWER_BUTTONS.lighter,
				ANSWER_BUTTONS.still_here,
				ANSWER_BUTTONS.heavier,
			],
			[REVEAL_BUTTON],
		]);
		for (const button of rows.flat()) {
			expect(button.callback_data).toMatch(/^[lshr]:[A-Za-z0-9_-]{1,62}$/);
		}
		expect(h.pushes).toHaveLength(0);
		const [delivery] = await deliveries(user);
		expect(delivery).toMatchObject({
			channel: "telegram",
			checkInOpen: true,
			providerChatId: CHAT,
			providerMessageId: String(FIRST_MESSAGE_ID),
			status: "sent",
		});
	});

	it("keeps the compounding domain out of the first line", async () => {
		const { user } = await linked();
		const { workflowId } = await seedCard(user, {
			cardText: "You've brought work here a few times lately.",
			compoundingDomain: "work",
			tier: "elevated",
		});

		await nudge(user, workflowId);

		const text = String(theCheckIn().call?.params.text);
		expect(text).toBe(fallbackFollowUpCard("elevated"));
		expect(text).not.toMatch(/work|monday|tuesday|\d/i);
	});

	it("offers no Heavier on an acute check-in, and adds Support resources when escalation-derived", async () => {
		const { user } = await linked();
		const { workflowId } = await seedCard(user, {
			escalationDerived: true,
			tier: "acute",
		});

		await nudge(user, workflowId);

		const { call } = theCheckIn();
		expect(call?.params.text).toBe(ACUTE_NUDGE_BODY);
		expect(keyboardOf(call)).toEqual([
			[
				expect.objectContaining({ text: ANSWER_BUTTONS.lighter }),
				expect.objectContaining({ text: ANSWER_BUTTONS.still_here }),
			],
			[expect.objectContaining({ text: REVEAL_BUTTON })],
			[{ text: SUPPORT_RESOURCES_BUTTON, url: appLink("support") }],
		]);
	});

	it("sends an acute check-in silently inside the quiet window", async () => {
		const { user } = await linked();
		// 12:00 UTC is past 10:00, so quiet.
		await setNotifications(user, {
			quietWindow: { dontReachAfter: 10, dontReachBefore: 8 },
			timezone: "UTC",
		});
		const { workflowId } = await seedCard(user, { tier: "acute" });

		await nudge(user, workflowId);

		expect(theCheckIn().call?.params.disable_notification).toBe(true);
	});
});

describe("a gentle return on a linked chat", () => {
	it("is push's text with one Open Xolace button", async () => {
		const { user } = await linked();

		await user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "It's been a while. We're here whenever." },
			emotionalProfileId: user.profileId,
			intent: "gentle_return",
			provenance: { triggerReason: "test" },
		});
		await processSoon(user.root);

		const [call] = sent("sendMessage");
		expect(call?.params).toMatchObject({
			protect_content: true,
			text: "It's been a while. We're here whenever.",
		});
		expect(keyboardOf(call)).toEqual([
			[{ text: OPEN_XOLACE_BUTTON, url: appLink("app") }],
		]);
		expect((await deliveries(user))[0]?.checkInOpen).toBeUndefined();
	});
});

describe("What was this about?", () => {
	it("edits the same message to quote the card, and never sends a new one", async () => {
		const { secret, user } = await linked();
		const { workflowId } = await seedCard(user);
		await nudge(user, workflowId);
		const { messageId, reveal } = theCheckIn();
		forgetCalls();

		await post(user.root, tapUpdate(reveal, messageId), secret);
		await processSoon(user.root);

		expect(sent("sendMessage")).toHaveLength(0);
		expect(sent("answerCallbackQuery")).toHaveLength(1);
		const [edit] = sent("editMessageText");
		const firstLine = fallbackFollowUpCard("standard");
		expect(edit?.params).toMatchObject({
			chat_id: CHAT,
			entities: [
				{
					length: CARD_TEXT.length,
					offset: firstLine.length + 2,
					type: "blockquote",
				},
			],
			message_id: messageId,
			text: `${firstLine}\n\n${CARD_TEXT}`,
		});
		expect(
			keyboardOf(edit)
				?.flat()
				.map((b) => b.text)
		).not.toContain(REVEAL_BUTTON);

		// A second tap (a double tap, or an old client) changes nothing.
		forgetCalls();
		await post(user.root, tapUpdate(reveal, messageId), secret);
		await processSoon(user.root);
		expect(sent("editMessageText")).toHaveLength(0);
		expect(sent("sendMessage")).toHaveLength(0);
	});

	it("on a closed check-in, says it has closed and collapses it again", async () => {
		const { secret, user } = await linked();
		const { workflowId } = await seedCard(user);
		await nudge(user, workflowId);
		const { messageId, reveal } = theCheckIn();
		await user.root.mutation(internal.followUps.markCardExpired, {
			workflowId,
		});
		await processSoon(user.root);
		forgetCalls();

		await post(user.root, tapUpdate(reveal, messageId), secret);
		await processSoon(user.root);

		expect(sent("answerCallbackQuery")[0]?.params.text).toBe(
			CHECK_IN_CLOSED_TOAST
		);
		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
		expect(sent("sendMessage")).toHaveLength(0);
	});

	it("a reveal edit retried after the check-in collapsed never shows the card again", async () => {
		const { user } = await linked();
		const { workflowId } = await seedCard(user);
		await nudge(user, workflowId);
		const { messageId } = theCheckIn();
		const [delivery] = await deliveries(user);
		await user.root.mutation(internal.followUps.markCardExpired, {
			workflowId,
		});
		await processSoon(user.root);
		forgetCalls();

		// A reveal held back by a 429, retried after the collapse.
		await user.root.action(internal.outreach.telegram.checkIn.edit, {
			edits: [
				{
					chatId: String(CHAT),
					keyboard: [],
					messageId: String(messageId),
					text: `revealed\n\n${CARD_TEXT}`,
					whileOpen: delivery?._id,
				},
			],
		});

		expect(sent("editMessageText")).toHaveLength(0);
	});

	it("does nothing for a tap naming another chat's message", async () => {
		const { secret, user } = await linked();
		const { workflowId } = await seedCard(user);
		await nudge(user, workflowId);
		const { messageId, reveal } = theCheckIn();
		forgetCalls();

		const tap = tapUpdate(reveal, messageId);
		const otherChat = STRANGER_CHAT + 7;
		tap.callback_query.from.id = otherChat;
		tap.callback_query.message.chat.id = otherChat;
		await post(user.root, tap, secret);
		await processSoon(user.root);

		expect(sent("editMessageText")).toHaveLength(0);
	});
});

describe("collapse", () => {
	async function sentCheckIn() {
		const linkedUser = await linked();
		const card = await seedCard(linkedUser.user);
		await nudge(linkedUser.user, card.workflowId);
		forgetCalls();
		return { ...linkedUser, ...card };
	}

	it("an answer in the app collapses it to what was answered", async () => {
		const { cardId, user } = await sentCheckIn();

		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "still_here",
		});
		await processSoon(user.root);

		expect(collapsedTo()).toEqual([
			{ buttons: 0, text: CHECKED_IN.still_here },
		]);
		expect((await deliveries(user))[0]?.checkInOpen).toBeUndefined();
	});

	it("a dismiss in the app collapses it to the closed line", async () => {
		const { cardId, user } = await sentCheckIn();

		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "dismissed",
		});
		await processSoon(user.root);

		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
	});

	it("expiry collapses it", async () => {
		const { user, workflowId } = await sentCheckIn();

		await user.root.mutation(internal.followUps.markCardExpired, {
			workflowId,
		});
		await processSoon(user.root);

		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
	});

	it("a newer follow-up superseding the card collapses it", async () => {
		const { user } = await sentCheckIn();
		const sessionId = await seedSession(user.root, user.profileId, {
			requiresFollowUp: true,
			state: "completed",
		});

		await user.root.mutation(internal.followUps.createAndStart, {
			cardText: "Something new.",
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			signals: {
				confirmationState: null,
				granularLabel: null,
				intensity: 3,
				primaryEmotion: null,
				safeguardLevel: null,
			},
		});
		await processSoon(user.root);

		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
	});

	it("unlinking from the app collapses it", async () => {
		const { user } = await sentCheckIn();

		await user.t.mutation(api.outreach.reachMe.unlinkChannel, {
			channel: "telegram",
		});
		await processSoon(user.root);

		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
	});

	it("/stop collapses it", async () => {
		const { secret, user } = await sentCheckIn();

		await post(user.root, messageUpdate(STRANGER_CHAT, "/stop"), secret);
		await processSoon(user.root);

		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
	});

	it("blocking the bot collapses it", async () => {
		const { secret, user } = await sentCheckIn();

		await post(
			user.root,
			{
				my_chat_member: {
					chat: { first_name: "Sam", id: STRANGER_CHAT, type: "private" },
					date: 0,
					from: { first_name: "Sam", id: STRANGER_CHAT, is_bot: false },
					new_chat_member: {
						status: "kicked",
						until_date: 0,
						user: { first_name: "Xolace", id: 1, is_bot: true },
					},
					old_chat_member: {
						status: "member",
						user: { first_name: "Xolace", id: 1, is_bot: true },
					},
				},
				update_id: 90_001,
			},
			secret
		);
		await processSoon(user.root);

		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
	});

	it("a second nudge leaves only the newest check-in live", async () => {
		const { user, workflowId } = await sentCheckIn();
		// The cadence's second nudge, a day later (its bucket is 1 a day).
		vi.advanceTimersByTime(25 * 3_600_000);

		await nudge(user, workflowId);

		expect(sent("sendMessage")).toHaveLength(1);
		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
		const open = (await deliveries(user)).filter((d) => d.checkInOpen);
		expect(open.map((d) => d.providerMessageId)).toEqual([
			String(FIRST_MESSAGE_ID + 1),
		]);
	});

	it("counts Telegram's 'message is not modified' as done", async () => {
		const { user, workflowId } = await sentCheckIn();
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		failNext("editMessageText", {
			description:
				"Bad Request: message is not modified: specified new message content and reply markup are exactly the same",
			error_code: 400,
		});

		await user.root.mutation(internal.followUps.markCardExpired, {
			workflowId,
		});
		await processSoon(user.root);

		expect(sent("editMessageText")).toHaveLength(1);
		expect(
			logged.mock.calls.filter((call) => String(call[0]).includes("Telegram"))
		).toEqual([]);
		logged.mockRestore();
	});
});

describe("answering by tap", () => {
	type Sent = Awaited<ReturnType<typeof sentCheckIn>>;

	async function sentCheckIn(card: Partial<Doc<"follow_up_cards">> = {}) {
		const linkedUser = await linked();
		const seeded = await seedCard(linkedUser.user, card);
		await nudge(linkedUser.user, seeded.workflowId);
		const buttons = keyboardOf(sent("sendMessage")[0])?.flat() ?? [];
		/** The check-in's button for `text`, as Telegram would send it back. */
		const answer = (text: string) => {
			const data = buttons.find((b) => b.text === text)?.callback_data;
			if (!data) {
				throw new Error(`no ${text} button`);
			}
			return data;
		};
		forgetCalls();
		return { ...linkedUser, ...seeded, answer };
	}

	async function tap(
		user: SeededUser,
		secret: string,
		data: string,
		messageId = FIRST_MESSAGE_ID
	) {
		await post(user.root, tapUpdate(data, messageId), secret);
		await processSoon(user.root);
	}

	const toasts = () => sent("answerCallbackQuery").map((c) => c.params.text);

	const appCard = async (user: SeededUser, cardId: Id<"follow_up_cards">) =>
		(await user.t.query(api.followUps.listForProfile, {})).find(
			(c) => c._id === cardId
		);

	it("resolves the card from Telegram, and the app sees the answer", async () => {
		const { answer, cardId, secret, user } = await sentCheckIn();

		await tap(user, secret, answer(ANSWER_BUTTONS.lighter));

		expect(await appCard(user, cardId)).toMatchObject({
			status: "resolved",
			userResponse: "lighter",
		});
		// No toast: the AI reply that follows acknowledges it (#770).
		expect(toasts()).toEqual([undefined]);
		expect(botCalls()[0]?.method).toBe("answerCallbackQuery");
		expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECKED_IN.lighter }]);
		expect(replies()).toEqual([
			"Thanks for checking in.\nHow's the rest of today?",
		]);
	});

	it("after an answer in the app, says it's already answered and collapses again", async () => {
		const { answer, cardId, secret, user } = await sentCheckIn();
		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "still_here",
		});
		await processSoon(user.root);
		forgetCalls();

		await tap(user, secret, answer(ANSWER_BUTTONS.lighter));

		expect(toasts()).toEqual([ALREADY_ANSWERED_TOAST]);
		expect(collapsedTo()).toEqual([
			{ buttons: 0, text: CHECKED_IN.still_here },
		]);
		expect(await appCard(user, cardId)).toMatchObject({
			userResponse: "still_here",
		});
	});

	it("counts any app response but a dismiss as already answered", async () => {
		const { answer, cardId, secret, user } = await sentCheckIn();
		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "processed",
		});
		await processSoon(user.root);
		forgetCalls();

		await tap(user, secret, answer(ANSWER_BUTTONS.lighter));

		expect(toasts()).toEqual([ALREADY_ANSWERED_TOAST]);
		expect(await appCard(user, cardId)).toMatchObject({
			userResponse: "processed",
		});
	});

	it("answered in Telegram first, a later app answer changes nothing", async () => {
		const { answer, cardId, secret, user } = await sentCheckIn();
		await tap(user, secret, answer(ANSWER_BUTTONS.heavier));

		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "lighter",
		});

		expect(await appCard(user, cardId)).toMatchObject({
			status: "resolved",
			userResponse: "heavier",
		});
	});

	it.each([
		[
			"dismissed",
			async ({ cardId, user }: Sent) => {
				await user.t.mutation(api.followUps.resolveCard, {
					cardId,
					response: "dismissed",
				});
			},
		],
		[
			"expired",
			async ({ user, workflowId }: Sent) => {
				await user.root.mutation(internal.followUps.markCardExpired, {
					workflowId,
				});
			},
		],
		[
			"superseded",
			async ({ user }: Sent) => {
				const sessionId = await seedSession(user.root, user.profileId, {
					requiresFollowUp: true,
					state: "completed",
				});
				await user.root.mutation(internal.followUps.createAndStart, {
					cardText: "Something new.",
					emotionalProfileId: user.profileId,
					escalationDerived: false,
					sessionId,
					signals: {
						confirmationState: null,
						granularLabel: null,
						intensity: 3,
						primaryEmotion: null,
						safeguardLevel: null,
					},
				});
			},
		],
	])(
		"on a %s card, says it has closed and collapses again",
		async (_status, closeCard) => {
			const checkIn = await sentCheckIn();
			await closeCard(checkIn);
			await processSoon(checkIn.user.root);
			const before = await appCard(checkIn.user, checkIn.cardId);
			forgetCalls();

			await tap(
				checkIn.user,
				checkIn.secret,
				checkIn.answer(ANSWER_BUTTONS.lighter)
			);

			expect(toasts()).toEqual([CHECK_IN_CLOSED_TOAST]);
			expect(collapsedTo()).toEqual([{ buttons: 0, text: CHECK_IN_CLOSED }]);
			expect(await appCard(checkIn.user, checkIn.cardId)).toEqual(before);
		}
	);

	it("ignores malformed, foreign or forged callback data", async () => {
		const { answer, cardId, secret, user } = await sentCheckIn({
			tier: "acute",
		});
		const deliveryId = answer(ANSWER_BUTTONS.lighter).slice(2);
		const forged = [
			"",
			"x",
			`z:${deliveryId}`,
			`l:${deliveryId}:extra`,
			"l:not-an-id",
			`l:${cardId}`,
			`l:${"a".repeat(200)}`,
			// Never offered on an acute check-in.
			`h:${deliveryId}`,
		];
		for (const data of forged) {
			await tap(user, secret, data);
		}
		// The right data, from a chat that isn't the one it was sent to.
		const fromElsewhere = tapUpdate(answer(ANSWER_BUTTONS.lighter), 1);
		fromElsewhere.callback_query.from.id = STRANGER_CHAT + 7;
		fromElsewhere.callback_query.message.chat.id = STRANGER_CHAT + 7;
		await post(user.root, fromElsewhere, secret);
		await processSoon(user.root);

		expect(await appCard(user, cardId)).toMatchObject({ status: "pending" });
		expect(sent("editMessageText")).toHaveLength(0);
		// Every tap is still answered, so no button keeps spinning.
		expect(toasts()).toEqual(Array(forged.length + 1).fill(undefined));
		// Tap updates are numbered from 50 000; the link's /start is below.
		const taps = (await events(user.root)).filter(
			(e) => Number(e.providerEventId) > 50_000
		);
		expect(taps.map((e) => e.status)).toEqual(
			Array(forged.length + 1).fill("ignored")
		);
	});

	it("resolves the card once when two taps arrive together", async () => {
		const { answer, cardId, secret, user } = await sentCheckIn();

		await post(
			user.root,
			tapUpdate(answer(ANSWER_BUTTONS.lighter), FIRST_MESSAGE_ID),
			secret
		);
		await post(
			user.root,
			tapUpdate(answer(ANSWER_BUTTONS.still_here), FIRST_MESSAGE_ID),
			secret
		);
		await processSoon(user.root);

		expect(await appCard(user, cardId)).toMatchObject({
			status: "resolved",
			userResponse: "lighter",
		});
		expect(toasts()).toEqual([undefined, ALREADY_ANSWERED_TOAST]);
		expect(collapsedTo().at(-1)).toEqual({
			buttons: 0,
			text: CHECKED_IN.lighter,
		});
	});
});

describe("delivery failures", () => {
	it("a 403 revokes the link unreachable and falls back to push once", async () => {
		const { user } = await linked();
		const { workflowId } = await seedCard(user);
		blockChat(STRANGER_CHAT);

		await nudge(user, workflowId);
		await processSoon(user.root);

		const rows = await deliveries(user);
		expect(
			rows.map((d) => ({
				channel: d.channel,
				isFallback: d.isFallback,
				status: d.status,
			}))
		).toEqual([
			{ channel: "telegram", isFallback: false, status: "unreachable" },
			{ channel: "push", isFallback: true, status: "sent" },
		]);
		expect(h.pushes).toHaveLength(1);
		const [identity] = await identities(user);
		expect(identity).toMatchObject({
			revokedReason: "unreachable",
			status: "revoked",
		});
	});

	it("a 429 retries on the Telegram pool after retry_after, without a fallback", async () => {
		const { user } = await linked();
		const { workflowId } = await seedCard(user);
		failNext("sendMessage", {
			description: "Too Many Requests: retry after 3",
			error_code: 429,
			parameters: { retry_after: 3 },
		});

		await nudge(user, workflowId);
		await processSoon(user.root);

		expect(sent("sendMessage")).toHaveLength(2);
		const rows = await deliveries(user);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			attempts: 2,
			channel: "telegram",
			status: "sent",
		});
		expect(h.pushes).toHaveLength(0);
	});
});

describe("the daily Telegram cap", () => {
	const enqueueNudge = (
		user: SeededUser,
		cardId: Id<"follow_up_cards">,
		tier: "acute" | "standard",
		n: number
	) =>
		user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "checking in" },
			dedupeKey: `nudge:${cardId}:${n}`,
			emotionalProfileId: user.profileId,
			followUpId: cardId,
			intent: "nudge",
			provenance: { triggerReason: "test" },
			tier,
		});

	it("sends the fourth outreach of the day by push, but never holds back an acute nudge", async () => {
		const { user } = await linked();
		const acute = await seedCard(user, { tier: "acute" });
		const standard = await seedCard(user);

		await user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "It's been a while." },
			emotionalProfileId: user.profileId,
			intent: "gentle_return",
			provenance: { triggerReason: "test" },
		});
		await enqueueNudge(user, acute.cardId, "acute", 1);
		await enqueueNudge(user, acute.cardId, "acute", 2);
		await processSoon(user.root);
		expect(sent("sendMessage")).toHaveLength(3);

		await enqueueNudge(user, standard.cardId, "standard", 1);
		await processSoon(user.root);
		expect(sent("sendMessage")).toHaveLength(3);
		expect(h.pushes).toHaveLength(1);

		await enqueueNudge(user, acute.cardId, "acute", 3);
		await processSoon(user.root);
		expect(sent("sendMessage")).toHaveLength(4);
		expect(h.pushes).toHaveLength(1);
	});
});

describe("app links", () => {
	it("redirect a button into the app's scheme, and nothing else", async () => {
		const t = backend();
		const support = await t.fetch("/telegram/open/support", {
			method: "GET",
		});
		expect(support.status).toBe(302);
		expect(support.headers.get("Location")).toBe(
			"xolace://crisis-resources?from=telegram"
		);
		const app = await t.fetch("/telegram/open/app", { method: "GET" });
		expect(app.headers.get("Location")).toBe("xolace://");
		const other = await t.fetch("/telegram/open/https:evil", {
			method: "GET",
		});
		expect(other.status).toBe(404);
	});
});
