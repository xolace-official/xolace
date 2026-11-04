// @vitest-environment edge-runtime
/**
 * #696: the two Xolacer badges, from the seeker's side only. What can go
 * wrong: a re-request earning it again, the Xolacer's messages (or their
 * accepting) counting for the seeker, a message before acceptance counting,
 * or a redelivered webhook awarding twice.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { xolacerChannelId } from "../lib/chatNotifications";
import { DECLINE_COOLDOWN_MS } from "../lib/conversationGating";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, noopJob, posthogMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../presence", async (orig) => ({
	...(await orig<typeof import("../presence")>()),
	presentProfileIds: async () => new Set(),
}));
vi.mock("../streamSetup", async (orig) => ({
	...(await orig<typeof import("../streamSetup")>()),
	addToXolaceChannel: noopJob(),
}));

beforeEach(() => {
	vi.useFakeTimers();
	process.env.XOLACER_CHAT_ENABLED = "true";
});
afterEach(() => vi.useRealTimers());

/** Every achievement the user holds except Joined, oldest first. */
const earned = async (user: SeededUser) =>
	(
		await user.root.run((ctx) =>
			ctx.db
				.query("user_achievements")
				.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		)
	)
		.map((r) => r.achievementId)
		.filter((id) => id !== "joined");
const profile = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db.get("emotional_profiles", user.profileId)
	) as Promise<Doc<"emotional_profiles">>;

/** A seeker and a published, active Xolacer on the same backend. */
async function seekerAndXolacer() {
	const seeker = await asNewUser(1);
	const xolacer = await asNewUser(2, seeker.root);
	await seeker.root.run((ctx) =>
		ctx.db.insert("xolacer_profiles", {
			active: true,
			complete: true,
			createdAt: Date.now(),
			displayName: "River",
			emotionalProfileId: xolacer.profileId,
			updatedAt: Date.now(),
		})
	);
	return { seeker, xolacer };
}

const request = (seeker: SeededUser, xolacer: SeededUser) =>
	seeker.t.mutation(api.xolacerChat.requestConversation, {
		xolacerProfileId: xolacer.profileId,
	});

describe("Asked for a chat", () => {
	it("is earned by the seeker's first request, and never by the Xolacer", async () => {
		const { seeker, xolacer } = await seekerAndXolacer();
		await request(seeker, xolacer);

		expect(await earned(seeker)).toEqual(["asked-for-chat"]);
		expect(await earned(xolacer)).toEqual([]);
	});

	it("a re-request after a decline awards nothing", async () => {
		const { seeker, xolacer } = await seekerAndXolacer();
		const conversationId = await request(seeker, xolacer);
		await xolacer.t.mutation(api.xolacerChat.declineRequest, {
			conversationId,
		});
		vi.advanceTimersByTime(DECLINE_COOLDOWN_MS);
		const sparksBefore = (await profile(seeker)).sparksEarned;

		expect(await request(seeker, xolacer)).toBe(conversationId);
		expect(await earned(seeker)).toEqual(["asked-for-chat"]);
		expect((await profile(seeker)).sparksEarned).toBe(sparksBefore);
	});

	it("a re-request on a pair from before badges existed awards nothing", async () => {
		const { seeker, xolacer } = await seekerAndXolacer();
		// Declined long ago, before Asked for a chat could be earned live: its
		// request is the backfill's to date (#686), not the re-request's.
		const conversationId = await seeker.root.run((ctx) =>
			ctx.db.insert("xolacer_conversations", {
				closedReason: "declined",
				declinedAt: Date.now() - DECLINE_COOLDOWN_MS,
				requestedAt: Date.now() - DECLINE_COOLDOWN_MS,
				status: "closed",
				userProfileId: seeker.profileId,
				xolacerProfileId: xolacer.profileId,
			})
		);

		expect(await request(seeker, xolacer)).toBe(conversationId);
		expect(await earned(seeker)).toEqual([]);
	});
});

// ── The message webhook ──────────────────────────────────────────

/** The seeker's request, accepted the way `acceptRequest` lands it. */
async function acceptedConversation() {
	const { seeker, xolacer } = await seekerAndXolacer();
	const conversationId = await request(seeker, xolacer);
	await seeker.root.mutation(internal.xolacerChat.markAccepted, {
		conversationId,
		streamChannelId: xolacerChannelId(conversationId),
	});
	return { conversationId, seeker, xolacer };
}

/** Stream's `message.new` for `sender`, as the webhook hands it over. */
const deliverMessage = (
	sender: SeededUser,
	conversationId: Id<"xolacer_conversations">,
	webhookId?: string
) =>
	sender.root.mutation(internal.xolacerChat.notifyNewMessage, {
		channelId: xolacerChannelId(conversationId),
		senderId: sender.profileId,
		text: "hi",
		webhookId,
	});

describe("First Xolacer chat", () => {
	it("is earned by the seeker's first message after acceptance", async () => {
		const { conversationId, seeker, xolacer } = await acceptedConversation();
		await deliverMessage(seeker, conversationId, "wh_1");

		expect(await earned(seeker)).toEqual([
			"asked-for-chat",
			"first-xolacer-chat",
		]);
		expect(await earned(xolacer)).toEqual([]);
	});

	it("the Xolacer's messages earn it for nobody", async () => {
		const { conversationId, seeker, xolacer } = await acceptedConversation();
		await deliverMessage(xolacer, conversationId, "wh_1");
		await deliverMessage(xolacer, conversationId, "wh_2");

		expect(await earned(seeker)).toEqual(["asked-for-chat"]);
		expect(await earned(xolacer)).toEqual([]);
	});

	it("a message before the request is accepted earns nothing", async () => {
		const { seeker, xolacer } = await seekerAndXolacer();
		const conversationId = await request(seeker, xolacer);
		await deliverMessage(seeker, conversationId, "wh_1");

		expect(await earned(seeker)).toEqual(["asked-for-chat"]);
	});

	it("a redelivered webhook awards nothing twice", async () => {
		const { conversationId, seeker } = await acceptedConversation();
		await deliverMessage(seeker, conversationId, "wh_1");
		const sparksAfterFirst = (await profile(seeker)).sparksEarned;

		await deliverMessage(seeker, conversationId, "wh_1");
		await deliverMessage(seeker, conversationId, "wh_2");

		expect(await earned(seeker)).toEqual([
			"asked-for-chat",
			"first-xolacer-chat",
		]);
		expect((await profile(seeker)).sparksEarned).toBe(sparksAfterFirst);
	});
});
