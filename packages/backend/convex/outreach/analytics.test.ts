// @vitest-environment edge-runtime
/**
 * #774: usage analytics for outreach channels, sent to PostHog from the
 * server. Driven through the real link, revoke, routing, delivery, answer and
 * inbound paths, with PostHog replaced by a recorder. What can go wrong: an
 * event carries a key outside its allowlist (text, a Telegram id, an
 * outreach id, a raw error); a crisis text reaches PostHog; an answer names
 * the wrong surface or nudge channel; a routing outcome is sent twice or not
 * at all.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	vi,
	it as vitestIt,
} from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
	EMPTY_CATEGORIES,
	type ModerationResult,
} from "../ai/providers/moderation";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { OUTREACH_EVENT_KEYS } from "./analytics";
import { DAILY_REPLY_CAP } from "./telegram/caps";
import { ANSWER_BUTTONS } from "./telegram/copy";
import {
	backend,
	blockChat,
	configure,
	createLink,
	DAY,
	forgetCalls,
	linkChat,
	messageUpdate,
	post,
	processSoon,
	STRANGER_CHAT,
	sent,
	setTelegram,
	setWebhookInfo,
	start,
	stubTelegramEachTest,
	tokenOf,
} from "./telegram/telegram.helpers";

type Captured = {
	distinctId?: string;
	event: string;
	properties?: Record<string, unknown>;
};

/** What the mocks record and return. */
const h = vi.hoisted(() => ({
	captured: [] as Captured[],
	moderation: null as unknown,
	/** The reply writer fails. */
	replyDown: false,
}));

vi.mock("../posthog", () => ({
	posthog: {
		capture: async (_ctx: unknown, args: Captured) => {
			h.captured.push(args);
		},
	},
}));
vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(() => false));
vi.mock("../lib/pushNotifications", () => ({
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
vi.mock("../ai/providers/moderation", async (orig) => ({
	...(await orig<typeof import("../ai/providers/moderation")>()),
	moderateInput: async () => h.moderation,
}));
vi.mock("../ai/providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../ai/providers/anthropic")>()),
	getAnthropicClient: () => ({
		messages: {
			create: async (body: { system: string }) => {
				if (!body.system.includes("private Telegram chat") || h.replyDown) {
					throw new Error("model down");
				}
				return {
					content: [{ text: "I'm here.\nHow are you now?", type: "text" }],
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
const CARD_TEXT = "Work has been a lot since Tuesday's review.";
const USER_TEXT = "Long day, but I walked it off.";
const CRISIS_TEXT = "I want to end my life";

stubTelegramEachTest();
beforeEach(() => {
	h.captured.length = 0;
	h.moderation = CLEAN;
	h.replyDown = false;
});

afterEach(() => {
	vi.restoreAllMocks();
});

const isOutreachEvent = (
	event: string
): event is keyof typeof OUTREACH_EVENT_KEYS =>
	Object.hasOwn(OUTREACH_EVENT_KEYS, event);

/**
 * Every event the test produced: a known event, only allowlisted keys, and
 * nothing that names the chat, an id or what anyone wrote.
 */
function expectOnlyAllowed() {
	for (const { event, properties } of h.captured) {
		if (!isOutreachEvent(event)) {
			throw new Error(`not an outreach event: ${event}`);
		}
		const allowed: readonly string[] = OUTREACH_EVENT_KEYS[event];
		for (const key of Object.keys(properties ?? {})) {
			expect(allowed, `${event}.${key}`).toContain(key);
		}
		const sentText = JSON.stringify(properties);
		for (const forbidden of [
			String(STRANGER_CHAT),
			"sam_t",
			CARD_TEXT,
			USER_TEXT,
			CRISIS_TEXT,
		]) {
			expect(sentText).not.toContain(forbidden);
		}
	}
}

/** `it`, then the allowlist check over everything it captured. */
const it = (name: string, body: () => Promise<void>) =>
	vitestIt(name, async () => {
		await body();
		expectOnlyAllowed();
	});

const named = (event: string) =>
	h.captured.filter((c) => c.event === event).map((c) => c.properties);

async function linkable() {
	const user = await asNewUser();
	backend(user.root);
	const secret = await configure(user.root);
	await setTelegram(user, { enabled: true, plan: "free" });
	forgetCalls();
	h.captured.length = 0;
	return { secret, user };
}

/** A linked chat (Telegram first), push on too, nothing captured yet. */
async function linked() {
	const { secret, user } = await linkable();
	await linkChat(user, secret);
	await setNotifications(user, { enabled: true });
	forgetCalls();
	h.captured.length = 0;
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
async function seedCard(user: SeededUser) {
	nextWorkflow += 1;
	const workflowId = `wf_analytics_${nextWorkflow}` as WorkflowId;
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
		})
	);
	return { cardId, workflowId };
}

async function nudge(user: SeededUser, workflowId: WorkflowId) {
	await user.root.mutation(internal.followUps.sendFollowUpNudge, {
		workflowId,
	});
	await processSoon(user.root);
}

type Keyboard = { callback_data?: string; text: string }[][];
let nextUpdate = 70_000;
function tapUpdate(data: string) {
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
				message_id: 101,
			},
		},
		update_id: nextUpdate,
	};
}

/** The sent check-in's button for an answer, as Telegram sends it back. */
function answerData(text: string): string {
	const markup = sent("sendMessage")[0]?.params.reply_markup as
		| { inline_keyboard: Keyboard }
		| undefined;
	const data = markup?.inline_keyboard
		.flat()
		.find((b) => b.text === text)?.callback_data;
	if (!data) {
		throw new Error(`no ${text} button`);
	}
	return data;
}

async function tap(user: SeededUser, secret: string, data: string) {
	await post(user.root, tapUpdate(data), secret);
	await processSoon(user.root);
}

async function write(user: SeededUser, secret: string, text: string) {
	await post(user.root, messageUpdate(STRANGER_CHAT, text), secret);
	await processSoon(user.root);
}

describe("linking and unlinking", () => {
	it("a first link sends channel_linked and sets telegram_linked", async () => {
		const { secret, user } = await linkable();
		await linkChat(user, secret);

		expect(named("channel_linked")).toEqual([
			{
				$set: { telegram_linked: true },
				channel: "telegram",
				plan: "free",
				relink: false,
				source: "settings",
			},
		]);
		expect(h.captured[0]?.distinctId).toBe(user.profileId);
	});

	it("a link from the offer card says so, and linking again is a relink", async () => {
		const { secret, user } = await linkable();
		await linkChat(user, secret);
		await user.t.action(api.outreach.telegram.link.createLink, {
			consentLanguageVersion: "telegram-1",
			source: "offer_card",
		});
		const link = await user.t.action(api.outreach.telegram.link.createLink, {
			consentLanguageVersion: "telegram-1",
			source: "offer_card",
		});
		await start(user, secret, tokenOf(link), STRANGER_CHAT + 1);

		expect(named("channel_linked")).toEqual([
			expect.objectContaining({ relink: false, source: "settings" }),
			expect.objectContaining({ relink: true, source: "offer_card" }),
		]);
		// The old chat left this account, but the account is still linked.
		expect(named("channel_unlinked")).toEqual([
			{ channel: "telegram", days_linked: 0, reason: "relinked" },
		]);
	});

	it("/stop sends channel_unlinked with the reason and days linked, and clears telegram_linked", async () => {
		const { secret, user } = await linked();
		vi.advanceTimersByTime(3 * DAY);
		await write(user, secret, "/stop");

		expect(named("channel_unlinked")).toEqual([
			{
				$set: { telegram_linked: false },
				channel: "telegram",
				days_linked: 3,
				reason: "user_telegram",
			},
		]);
	});

	it("an expired or unknown link sends nothing", async () => {
		const { secret, user } = await linkable();
		const token = tokenOf(await createLink(user));
		vi.advanceTimersByTime(DAY);
		await start(user, secret, token);
		expect(h.captured).toEqual([]);
	});
});

describe("routing", () => {
	/** A day apart each, so the shared daily bucket never decides. */
	const enqueue = (
		user: SeededUser,
		intent: "gentle_return" | "pattern_nudge"
	) => {
		vi.advanceTimersByTime(DAY);
		return user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "Thinking of you." },
			emotionalProfileId: user.profileId,
			intent,
			provenance: { triggerReason: "test" },
		});
	};

	it("routed, deferred, suppressed and no_channel each emit once", async () => {
		const { user } = await linked();
		await setNotifications(user, { patternNudge: true });

		await enqueue(user, "gentle_return");

		await setNotifications(user, {
			quietWindow: { dontReachAfter: 22, dontReachBefore: 13 },
			timezone: "UTC",
		});
		await enqueue(user, "gentle_return");
		await setNotifications(user, { quietWindow: undefined });

		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				lastSessionAt: Date.now() - 31 * DAY,
			})
		);
		await enqueue(user, "pattern_nudge");
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				lastSessionAt: undefined,
			})
		);

		await setTelegram(user, { enabled: false, plan: "free" });
		await setNotifications(user, { enabled: false });
		await enqueue(user, "gentle_return");

		expect(named("outreach_routed")).toEqual([
			{ channel: "telegram", intent: "gentle_return", outcome: "routed" },
			{ channel: "telegram", intent: "gentle_return", outcome: "deferred" },
			{
				intent: "pattern_nudge",
				outcome: "suppressed",
				suppressed_by: "dormancy",
			},
			{ intent: "gentle_return", outcome: "no_channel" },
		]);
	});

	it("a repeat call with the same dedupe key sends nothing more", async () => {
		const { user } = await linked();
		const args = {
			content: { body: "Thinking of you." },
			dedupeKey: "gentle:1",
			emotionalProfileId: user.profileId,
			intent: "gentle_return" as const,
			provenance: { triggerReason: "test" },
		};
		await user.root.mutation(internal.outreach.enqueue.enqueue, args);
		await user.root.mutation(internal.outreach.enqueue.enqueue, args);
		expect(named("outreach_routed")).toHaveLength(1);
	});
});

describe("delivery", () => {
	it("a delivered check-in sends outreach_delivery", async () => {
		const { user } = await linked();
		const { workflowId } = await seedCard(user);
		await nudge(user, workflowId);

		expect(named("outreach_delivery")).toEqual([
			{
				channel: "telegram",
				intent: "nudge",
				is_fallback: false,
				status: "delivered",
			},
		]);
	});

	it("a blocked chat fails with its error kind, and the push fallback is marked", async () => {
		const { user } = await linked();
		blockChat(STRANGER_CHAT);
		const { workflowId } = await seedCard(user);
		await nudge(user, workflowId);

		expect(named("outreach_delivery")).toEqual([
			{
				channel: "telegram",
				error_kind: "unreachable",
				intent: "nudge",
				is_fallback: false,
				status: "failed",
			},
			{
				channel: "push",
				intent: "nudge",
				is_fallback: true,
				status: "delivered",
			},
		]);
	});
});

describe("follow_up_resolved", () => {
	it("an answer tapped in Telegram names Telegram twice", async () => {
		const { secret, user } = await linked();
		const { workflowId } = await seedCard(user);
		await nudge(user, workflowId);
		await tap(user, secret, answerData(ANSWER_BUTTONS.lighter));

		expect(named("follow_up_resolved")).toEqual([
			{
				escalation_derived: false,
				nudge_channel: "telegram",
				plan: "free",
				response: "lighter",
				surface: "telegram",
				tier: "standard",
			},
		]);
	});

	it("an answer in the app after a Telegram nudge is surface app, nudge telegram", async () => {
		const { user } = await linked();
		const { cardId, workflowId } = await seedCard(user);
		await nudge(user, workflowId);
		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "heavier",
		});

		expect(named("follow_up_resolved")).toEqual([
			expect.objectContaining({
				nudge_channel: "telegram",
				response: "heavier",
				surface: "app",
			}),
		]);
	});

	it("an answer in the app with no nudge sent is nudge_channel none", async () => {
		const { user } = await linked();
		const { cardId } = await seedCard(user);
		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "still_here",
		});

		expect(named("follow_up_resolved")).toEqual([
			expect.objectContaining({ nudge_channel: "none", surface: "app" }),
		]);
	});
});

describe("telegram_inbound", () => {
	it("a tap and a text that get AI replies", async () => {
		const { secret, user } = await linked();
		const { workflowId } = await seedCard(user);
		await nudge(user, workflowId);
		await tap(user, secret, answerData(ANSWER_BUTTONS.still_here));
		await write(user, secret, USER_TEXT);

		expect(named("telegram_inbound")).toEqual([
			{ kind: "tap", outcome: "ai_reply", plan: "free" },
			{ kind: "text", outcome: "ai_reply", plan: "free" },
		]);
	});

	it("a tap on a check-in already answered is stale_card", async () => {
		const { secret, user } = await linked();
		const { cardId, workflowId } = await seedCard(user);
		await nudge(user, workflowId);
		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "lighter",
		});
		await tap(user, secret, answerData(ANSWER_BUTTONS.heavier));

		expect(named("telegram_inbound")).toEqual([
			{ kind: "tap", outcome: "stale_card", plan: "free" },
		]);
	});

	it("texts past the free daily cap are cap_reached", async () => {
		const { secret, user } = await linked();
		const texts = Array.from(
			{ length: DAILY_REPLY_CAP.free + 1 },
			(_, n) => `${USER_TEXT} ${n}`
		);
		for (const text of texts) {
			await write(user, secret, text);
		}
		const outcomes = named("telegram_inbound").map((p) => p?.outcome);
		expect(outcomes.at(-1)).toBe("cap_reached");
		expect(outcomes.filter((o) => o === "ai_reply")).toHaveLength(
			DAILY_REPLY_CAP.free
		);
	});

	it("a reply that couldn't be written isn't counted", async () => {
		const { secret, user } = await linked();
		h.replyDown = true;
		await write(user, secret, USER_TEXT);
		expect(sent("sendMessage").length).toBeGreaterThan(0);
		expect(named("telegram_inbound")).toEqual([]);
	});

	it("a stranger's text is stranger, under no person", async () => {
		const { secret, user } = await linkable();
		await write(user, secret, "hello?");
		expect(h.captured).toEqual([
			{
				distinctId: "telegram_stranger",
				event: "telegram_inbound",
				properties: {
					$process_person_profile: false,
					kind: "text",
					outcome: "stranger",
				},
			},
		]);
	});

	it("a crisis text sends nothing to PostHog", async () => {
		const { secret, user } = await linked();
		await write(user, secret, CRISIS_TEXT);

		expect(sent("sendMessage").length).toBeGreaterThan(0);
		expect(h.captured).toEqual([]);
	});
});

describe("webhook drift", () => {
	it("sends one drift event with the problems, under no person", async () => {
		const { user } = await linkable();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		setWebhookInfo({
			pending_update_count: 3,
			url: "https://elsewhere.example/hook",
		});
		await user.root.action(internal.outreach.telegram.bot.checkWebhook, {});

		expect(h.captured).toEqual([
			{
				distinctId: "xolace_server",
				event: "telegram_webhook_drift",
				properties: {
					$process_person_profile: false,
					pending_update_count: 3,
					problems: ["url_mismatch"],
				},
			},
		]);
	});
});
