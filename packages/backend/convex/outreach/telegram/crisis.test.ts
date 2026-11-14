// @vitest-environment edge-runtime
/**
 * #772: a crisis text to the bot, through the real webhook, the inbound pool
 * and the safeguard, with the model and moderation stubbed. What can go
 * wrong: the model answers a crisis; the reply names the wrong country's
 * numbers, or none when the country is unknown; a second crisis the same day
 * writes a second event; routine outreach lands during the 72 h hold; the
 * next reply forgets the crisis happened.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import {
	EMPTY_CATEGORIES,
	type ModerationResult,
} from "../../ai/providers/moderation";
import { seedSession } from "../../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../../test/mocks.helpers";
import type { OutreachIntent } from "../validators";
import { appLink } from "./appLinks";
import type { Keyboard } from "./checkIn";
import {
	FIND_A_HELPLINE_BUTTON,
	MORE_SUPPORT_BUTTON,
	OPEN_XOLACE_BUTTON,
} from "./copy";
import {
	backend,
	configure,
	DAY,
	forgetCalls,
	HOUR,
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

const stub = vi.hoisted(() => ({
	/** Every reply-writer call: its system prompt and turn. */
	asked: [] as { system: string; user: string }[],
	moderation: null as unknown,
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
				if (!body.system.includes("private Telegram chat")) {
					throw new Error("classifier down");
				}
				stub.asked.push({
					system: body.system,
					user: body.messages[0]?.content ?? "",
				});
				return {
					content: [
						{ text: "I'm here.\nHow are you doing now?", type: "text" },
					],
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

stubTelegramEachTest();
beforeEach(() => {
	stub.asked = [];
	stub.moderation = CLEAN;
});
afterEach(() => {
	vi.restoreAllMocks();
});

const CRISIS_TEXT = "I want to end my life";

/** What a linked chat in Ghana is sent after a crisis text. */
const GHANA_CRISIS_REPLY =
	"I'm really glad you told me.\n\nIf you're in danger right now, call 112.\nLifeline Ghana: 233-244-846-701\nNational Lifeline: 233-2-444-71279\n\nI'm still here, and so is Xolace.";

/** A linked chat (country GH, from the link's region), maybe with a card. */
async function linked(card?: Partial<Doc<"follow_up_cards">>) {
	const user = await asNewUser();
	backend(user.root);
	const secret = await configure(user.root);
	await setTelegram(user, { enabled: true, plan: "free" });
	await linkChat(user, secret);
	let cardId: Doc<"follow_up_cards">["_id"] | undefined;
	if (card) {
		const sessionId = await seedSession(user.root, user.profileId, {
			state: "completed",
		});
		cardId = await user.root.run((ctx) =>
			ctx.db.insert("follow_up_cards", {
				cardText: "Work has been a lot.",
				createdAt: Date.now(),
				emotionalProfileId: user.profileId,
				escalationDerived: false,
				sessionId,
				status: "pending",
				tier: "standard",
				workflowId: "wf_crisis_card" as WorkflowId,
				...card,
			})
		);
	}
	forgetCalls();
	const write = async (text: string) => {
		await post(user.root, messageUpdate(STRANGER_CHAT, text), secret);
		await processSoon(user.root);
	};
	return { cardId, user, write };
}

const lastReply = () => sent("sendMessage").at(-1);
const buttonsOf = (call: { params: Record<string, unknown> } | undefined) =>
	(
		(call?.params.reply_markup as { inline_keyboard: Keyboard } | undefined)
			?.inline_keyboard ?? []
	).flat();

const escalations = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("escalation_events")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);

describe("a crisis text", () => {
	it("writes one Telegram escalation event and sends the fixed reply with the country's numbers, no AI reply", async () => {
		const { user, write } = await linked();

		await write(CRISIS_TEXT);

		expect(stub.asked).toHaveLength(0);
		expect(sent("sendMessage")).toHaveLength(1);
		expect(lastReply()?.params).toMatchObject({
			protect_content: true,
			text: GHANA_CRISIS_REPLY,
		});
		expect(buttonsOf(lastReply())).toEqual([
			{ text: MORE_SUPPORT_BUTTON, url: appLink("support") },
			{ text: OPEN_XOLACE_BUTTON, url: appLink("app") },
		]);
		const events = await escalations(user);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			actionTaken: "crisis_line_presented",
			source: "telegram",
		});
		expect(events[0]?.sessionId).toBeUndefined();
		expect(events[0]?.inboundEventId).toBeDefined();
	});
});

describe("when the country is unknown", () => {
	it("points to the local emergency number and gives the IASP button as well as more support options", async () => {
		const { user, write } = await linked();
		const [identity] = await identities(user);
		if (!identity) {
			throw new Error("no linked chat");
		}
		await user.root.run((ctx) =>
			ctx.db.patch("channel_identities", identity._id, { country: undefined })
		);

		await write(CRISIS_TEXT);

		expect(lastReply()?.params.text).toBe(
			"I'm really glad you told me.\n\nIf you're in danger right now, call your local emergency number.\n\nI'm still here, and so is Xolace."
		);
		expect(buttonsOf(lastReply())).toEqual([
			{
				text: FIND_A_HELPLINE_BUTTON,
				url: "https://www.iasp.info/resources/Crisis_Centres/",
			},
			{ text: MORE_SUPPORT_BUTTON, url: appLink("support") },
			{ text: OPEN_XOLACE_BUTTON, url: appLink("app") },
		]);
	});
});

describe("dedupe", () => {
	it("writes no second event for a second crisis the same day, and still answers it", async () => {
		const { user, write } = await linked();

		await write(CRISIS_TEXT);
		vi.advanceTimersByTime(6 * HOUR);
		await write(CRISIS_TEXT);

		expect(await escalations(user)).toHaveLength(1);
		expect(sent("sendMessage")).toHaveLength(2);
		expect(lastReply()?.params.text).toBe(GHANA_CRISIS_REPLY);
	});

	it("writes a new event a day later", async () => {
		const { user, write } = await linked();

		await write(CRISIS_TEXT);
		vi.advanceTimersByTime(DAY + HOUR);
		await write(CRISIS_TEXT);

		expect(await escalations(user)).toHaveLength(2);
	});

	it("marks an open card escalation-derived and writes one event for it", async () => {
		const { cardId, user, write } = await linked({});

		await write(CRISIS_TEXT);
		vi.advanceTimersByTime(DAY + HOUR);
		await write(CRISIS_TEXT);

		const events = await escalations(user);
		expect(events).toHaveLength(1);
		expect(events[0]?.followUpCardId).toBe(cardId);
		if (!cardId) {
			throw new Error("no card");
		}
		const card = await user.root.run((ctx) =>
			ctx.db.get("follow_up_cards", cardId)
		);
		expect(card).toMatchObject({ escalationDerived: true });
	});

	it("leaves a closed card alone and dedupes by day", async () => {
		const { user, write } = await linked({ status: "resolved" });

		await write(CRISIS_TEXT);

		const [event] = await escalations(user);
		expect(event?.followUpCardId).toBeUndefined();
	});
});

describe("the 72 h hold", () => {
	const INTENTS: OutreachIntent[] = [
		"nudge",
		"gentle_return",
		"pattern_nudge",
		"milestone",
		"kindling_ready",
		"domain_unlock",
		"achievement",
	];
	const enqueue = (user: SeededUser, intent: OutreachIntent) =>
		user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "Hello." },
			emotionalProfileId: user.profileId,
			intent,
			provenance: { triggerReason: "test" },
		});

	it.each(INTENTS)(
		"suppresses %s with escalation_active for 72 h, then lets it through",
		async (intent) => {
			const { user, write } = await linked();
			await write(CRISIS_TEXT);

			vi.advanceTimersByTime(71 * HOUR);
			expect(await enqueue(user, intent)).toMatchObject({
				suppressedReason: "escalation_active",
			});

			vi.advanceTimersByTime(2 * HOUR);
			expect(await enqueue(user, intent)).not.toMatchObject({
				suppressedReason: "escalation_active",
			});
		}
	);

	it("counts from the latest crisis, though it shares the first one's event", async () => {
		const { user, write } = await linked();
		await write(CRISIS_TEXT);
		vi.advanceTimersByTime(20 * HOUR);
		await write(CRISIS_TEXT);
		expect(await escalations(user)).toHaveLength(1);

		// 80 h after the first, 60 after the latest.
		vi.advanceTimersByTime(60 * HOUR);

		expect(await enqueue(user, "gentle_return")).toMatchObject({
			suppressedReason: "escalation_active",
		});
	});

	it("holds the open card's own nudge too, though the crisis made it escalation-derived", async () => {
		const { cardId, user, write } = await linked({});
		await write(CRISIS_TEXT);
		const nudge = () =>
			user.root.mutation(internal.outreach.enqueue.enqueue, {
				content: { body: "Checking in." },
				emotionalProfileId: user.profileId,
				followUpId: cardId,
				intent: "nudge",
				provenance: { triggerReason: "test" },
				tier: "standard",
			});

		vi.advanceTimersByTime(71 * HOUR);
		expect(await nudge()).toMatchObject({
			suppressedReason: "escalation_active",
		});

		vi.advanceTimersByTime(2 * HOUR);
		expect(await nudge()).not.toMatchObject({
			suppressedReason: "escalation_active",
		});
	});
});

describe("the next reply", () => {
	it("knows a crisis happened", async () => {
		const { write } = await linked();
		await write(CRISIS_TEXT);
		vi.advanceTimersByTime(HOUR);

		await write("A bit calmer now");

		expect(stub.asked).toHaveLength(1);
		expect(stub.asked[0]?.user).toContain("may be in crisis");
	});

	it("doesn't mention a crisis when there was none", async () => {
		const { write } = await linked();

		await write("A bit calmer now");

		expect(stub.asked[0]?.user).not.toContain("may be in crisis");
	});
});
