// @vitest-environment edge-runtime
/**
 * #763: the outreach layer, shipped dark. Driven through `enqueue`, the one
 * way in, with `sendPushToProfile` mocked and the real rate limiter and
 * workpool registered. What can go wrong: a gate runs out of order and the
 * wrong reason is recorded (or a bucket is spent on an outreach a toggle
 * stopped); a repeat call sends twice; an escalation-derived card's own nudge
 * is held with everything else, or another intent slips past it; the 72 h
 * hold or 30-day dormancy leaks; the quiet window drops instead of deferring,
 * or defers an acute nudge; the kill switch or plan gate is ignored; a failed
 * delivery falls back more than once, or not at all; the push payload or its
 * `notification_log` row drifts from today's.
 */
import workpoolTest from "@convex-dev/workpool/test";
import type { FunctionArgs } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimiterSchema from "../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { expectCode, seedSession } from "../test/fixtures.helpers";
import {
	asAdmin,
	asNewUser,
	asUser,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, noopJob, revenuecatMock } from "../test/mocks.helpers";
import { ChannelError } from "./adapters";

type Sent = {
	emotionalProfileId: string;
	notification: Record<string, unknown> & { data?: Record<string, unknown> };
};

const h = vi.hoisted(() => ({
	plus: false,
	pushes: [] as Sent[],
	pushFailures: [] as Error[],
	telegram: {
		configured: false,
		failures: [] as Error[],
		sends: [] as string[],
	},
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(() => h.plus));
vi.mock("../lib/pushNotifications", () => ({
	sendPushToProfile: async (_ctx: unknown, args: Sent) => {
		const failure = h.pushFailures.shift();
		if (failure) {
			throw failure;
		}
		h.pushes.push(args);
	},
}));
vi.mock("../streamSetup", async (orig) => ({
	...(await orig<typeof import("../streamSetup")>()),
	addToXolaceChannel: noopJob(),
}));
// A stand-in second channel, so routing and the one fallback can be seen:
// Telegram itself has no adapter until rollout stage 3.
vi.mock("./adapters", async (orig) => {
	const real = await orig<typeof import("./adapters")>();
	const push = real.ADAPTERS.push;
	if (!push) {
		throw new Error("push adapter missing");
	}
	return {
		...real,
		ADAPTERS: {
			...real.ADAPTERS,
			telegram: {
				channel: "telegram",
				configured: () => h.telegram.configured,
				deliveryMode: "push",
				pool: push.pool,
				send: async (
					_ctx: unknown,
					_delivery: unknown,
					outreach: Doc<"outreach">
				) => {
					const failure = h.telegram.failures.shift();
					if (failure) {
						throw failure;
					}
					h.telegram.sends.push(outreach.content.body);
					return { providerChatId: "1", providerMessageId: "2" };
				},
			},
		},
	};
});

const rateLimiterModules = import.meta.glob(
	"../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts"
);

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 13, 12, 0);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	h.plus = false;
	h.pushFailures.length = 0;
	h.pushes.length = 0;
	h.telegram.configured = false;
	h.telegram.failures.length = 0;
	h.telegram.sends.length = 0;
});
afterEach(() => vi.useRealTimers());

const setNotifications = (
	user: SeededUser,
	notifications: Partial<Doc<"preferences">["notifications"]>
) =>
	user.root.run(async (ctx) => {
		const p = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		if (!p) {
			throw new Error("no preferences row");
		}
		await ctx.db.patch("preferences", p._id, {
			notifications: { ...p.notifications, ...notifications },
		});
	});

/** A user with every outreach toggle on and push enabled. */
async function reachable(n = 1, root?: SeededUser["root"]) {
	const user = await asNewUser(n, root);
	if (!root) {
		user.root.registerComponent(
			"rateLimiter",
			rateLimiterSchema,
			rateLimiterModules
		);
		workpoolTest.register(user.root, "outreachPush");
	}
	await setNotifications(user, {
		achievement: true,
		enabled: true,
		gentleReturn: true,
		milestone: true,
		patternNudge: true,
	});
	return user;
}

type EnqueueArgs = FunctionArgs<typeof internal.outreach.enqueue.enqueue>;

const enqueue = (user: SeededUser, args: Partial<EnqueueArgs> = {}) =>
	user.root.mutation(internal.outreach.enqueue.enqueue, {
		content: { body: "It's been a little while." },
		emotionalProfileId: user.profileId,
		intent: "gentle_return",
		provenance: { triggerReason: "test" },
		...args,
	});

const drain = (user: SeededUser) =>
	user.root.finishAllScheduledFunctions(vi.runAllTimers);

const deliveriesOf = (user: SeededUser, outreachId: Id<"outreach">) =>
	user.root.run((ctx) =>
		ctx.db
			.query("outreach_deliveries")
			.withIndex("by_outreach", (q) => q.eq("outreachId", outreachId))
			.collect()
	);

const outreachRow = (user: SeededUser, outreachId: Id<"outreach">) =>
	user.root.run((ctx) => ctx.db.get("outreach", outreachId));

async function seedCard(
	user: SeededUser,
	overrides: Partial<Doc<"follow_up_cards">> = {}
): Promise<Id<"follow_up_cards">> {
	const sessionId = await seedSession(user.root, user.profileId);
	return await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: "How's it sitting now?",
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			status: "pending",
			tier: "standard",
			workflowId: `wf_${sessionId}` as Doc<"follow_up_cards">["workflowId"],
			...overrides,
		})
	);
}

async function seedEscalation(user: SeededUser, createdAt: number) {
	const sessionId = await seedSession(user.root, user.profileId);
	await user.root.run((ctx) =>
		ctx.db.insert("escalation_events", {
			actionTaken: "resources_shown",
			createdAt,
			emotionalProfileId: user.profileId,
			resourcesPresented: [],
			reviewedByHuman: false,
			sessionId,
			triggerConfidence: 0.9,
			triggerEvidence: "test",
			triggerType: "explicit_crisis_language",
		})
	);
}

/** Link the stand-in Telegram and open its config row. */
async function linkTelegram(user: SeededUser, order: ("push" | "telegram")[]) {
	h.telegram.configured = true;
	await asAdmin(9, user.root).mutation(
		api.admin.outreachChannels.setChannelConfig,
		{ channel: "telegram", enabled: true, plan: "free" }
	);
	await user.root.run((ctx) =>
		ctx.db.insert("channel_identities", {
			channel: "telegram",
			emotionalProfileId: user.profileId,
			externalId: "42",
			linkedAt: Date.now(),
			status: "active",
			tokenIdentifier: "test|42",
		})
	);
	await setNotifications(user, { channelOrder: order });
}

describe("push delivery", () => {
	it("sends today's payload through the workpool and writes one notification_log row", async () => {
		const user = await reachable();
		const result = await enqueue(user, {
			content: { body: "How's it sitting now?" },
			intent: "nudge",
			tier: "standard",
		});
		expect(result.outcome).toBe("queued");
		expect(h.pushes).toHaveLength(0);

		await drain(user);

		const log = await user.t.query(api.notifications.list, {});
		expect(log).toHaveLength(1);
		expect(log[0]).toMatchObject({
			content: "How's it sitting now?",
			delivered: true,
			outreachId: result.outreachId,
			type: "follow_up",
		});
		expect(h.pushes).toEqual([
			{
				emotionalProfileId: user.profileId,
				notification: {
					body: "How's it sitting now?",
					channelId: "nudge",
					data: { logId: log[0]?._id, type: "follow_up" },
					sound: "nudge.wav",
					title: "Xolace",
				},
			},
		]);
		const [delivery] = await deliveriesOf(user, result.outreachId);
		expect(delivery).toMatchObject({
			attempts: 1,
			channel: "push",
			isFallback: false,
			notificationLogId: log[0]?._id,
			status: "sent",
		});
	});

	it("maps an affirmation-shaped gentle return back to the old literal", async () => {
		const user = await reachable();
		await enqueue(user, {
			provenance: { affirmation: true, triggerReason: "affirmation" },
		});
		await drain(user);
		expect(h.pushes[0]?.notification.data?.type).toBe("affirmation");
	});

	it("retries a `retry` error inside the workpool, then sends", async () => {
		const user = await reachable();
		h.pushFailures.push(new ChannelError("retry", { afterMs: 1000 }));
		const { outreachId } = await enqueue(user);
		await drain(user);
		const [delivery] = await deliveriesOf(user, outreachId);
		expect(delivery).toMatchObject({ attempts: 2, status: "sent" });
		expect(h.pushes).toHaveLength(1);
	});
});

describe("gates", () => {
	it("returns the existing row for a repeated dedupe key and sends once", async () => {
		const user = await reachable();
		const first = await enqueue(user, { dedupeKey: "nudge:card:1" });
		const again = await enqueue(user, { dedupeKey: "nudge:card:1" });
		expect(again).toEqual(first);
		await drain(user);
		expect(h.pushes).toHaveLength(1);
	});

	it("suppresses everything for a deleted account", async () => {
		const user = await reachable();
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "deleted" })
		);
		expect(await enqueue(user)).toMatchObject({
			outcome: "suppressed",
			suppressedReason: "account_deleted",
		});
	});

	it("holds every intent but its own nudge while an escalation-derived card is open", async () => {
		const user = await reachable();
		const cardId = await seedCard(user, {
			escalationDerived: true,
			tier: "acute",
		});
		const otherCard = await seedCard(user);
		// A crisis event raised the card; the hold does not stop its own nudge.
		await seedEscalation(user, NOW - HOUR);

		expect(await enqueue(user)).toMatchObject({
			suppressedReason: "escalation_active",
		});
		expect(
			await enqueue(user, {
				followUpId: otherCard,
				intent: "nudge",
				tier: "standard",
			})
		).toMatchObject({ suppressedReason: "escalation_active" });
		expect(
			await enqueue(user, {
				followUpId: cardId,
				intent: "nudge",
				tier: "acute",
			})
		).toMatchObject({ outcome: "queued" });
	});

	it("holds every intent for 72 h after an escalation event", async () => {
		const user = await reachable();
		await seedEscalation(user, NOW - 71 * HOUR);
		expect(await enqueue(user, { intent: "achievement" })).toMatchObject({
			suppressedReason: "escalation_active",
		});
	});

	it("lets outreach through once the 72 h hold has passed", async () => {
		const user = await reachable();
		await seedEscalation(user, NOW - 73 * HOUR);
		expect(await enqueue(user)).toMatchObject({ outcome: "queued" });
	});

	it("suppresses gentle returns, pattern nudges and kindling after 30 days without a session", async () => {
		const user = await reachable();
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				lastSessionAt: NOW - 31 * DAY,
			})
		);
		for (const intent of [
			"gentle_return",
			"pattern_nudge",
			"kindling_ready",
		] as const) {
			expect(await enqueue(user, { intent })).toMatchObject({
				suppressedReason: "user_inactive",
			});
		}
		expect(await enqueue(user, { intent: "milestone" })).toMatchObject({
			outcome: "queued",
		});
	});

	it("respects the per-intent toggle", async () => {
		const user = await reachable();
		await setNotifications(user, { gentleReturn: false });
		for (const intent of ["gentle_return", "nudge"] as const) {
			expect(await enqueue(user, { intent, tier: "standard" })).toMatchObject({
				suppressedReason: "toggle_off",
			});
		}
		expect(await enqueue(user, { intent: "pattern_nudge" })).toMatchObject({
			outcome: "queued",
		});
	});

	it("rate-limits per type bucket", async () => {
		const user = await reachable();
		expect(await enqueue(user)).toMatchObject({ outcome: "queued" });
		// `notification` is shared by gentle returns and pattern nudges.
		expect(await enqueue(user, { intent: "pattern_nudge" })).toMatchObject({
			suppressedReason: "rate_limit",
		});
		// Its own bucket, so still room.
		expect(await enqueue(user, { intent: "achievement" })).toMatchObject({
			outcome: "queued",
		});
	});

	it("checks the toggle before spending the rate bucket", async () => {
		const user = await reachable();
		await setNotifications(user, { gentleReturn: false });
		await enqueue(user);
		await setNotifications(user, { gentleReturn: true });
		expect(await enqueue(user)).toMatchObject({ outcome: "queued" });
	});

	it("records the earliest gate's reason when several apply", async () => {
		const user = await reachable();
		await setNotifications(user, { gentleReturn: false });
		await seedEscalation(user, NOW - HOUR);
		expect(await enqueue(user)).toMatchObject({
			suppressedReason: "escalation_active",
		});
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "deleted" })
		);
		expect(await enqueue(user)).toMatchObject({
			suppressedReason: "account_deleted",
		});
	});

	it("drops a deferred outreach when the account is deleted before it sends", async () => {
		vi.setSystemTime(Date.UTC(2026, 10, 13, 23, 30));
		const user = await reachable();
		await setNotifications(user, {
			quietWindow: { dontReachAfter: 21, dontReachBefore: 8 },
			timezone: "UTC",
		});
		const { outreachId } = await enqueue(user);
		// Gates 2 and 3 run again at send time. A deletion request is used here
		// rather than a crisis: the workpool's idle loop moves the fake clock
		// past any 72 h hold before the delivery runs.
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "deleted" })
		);

		await drain(user);
		expect(h.pushes).toHaveLength(0);
		expect(await outreachRow(user, outreachId)).toMatchObject({
			outcome: "suppressed",
			suppressedReason: "account_deleted",
		});
		const [delivery] = await deliveriesOf(user, outreachId);
		expect(delivery?.status).toBe("canceled");
	});

	it("defers to the end of the quiet window, and an acute nudge ignores it", async () => {
		vi.setSystemTime(Date.UTC(2026, 10, 13, 23, 30));
		const user = await reachable();
		await setNotifications(user, {
			quietWindow: { dontReachAfter: 21, dontReachBefore: 8 },
			timezone: "UTC",
		});

		const deferred = await enqueue(user);
		const acute = await enqueue(user, { intent: "nudge", tier: "acute" });

		expect((await outreachRow(user, deferred.outreachId))?.sendAt).toBe(
			Date.UTC(2026, 10, 14, 8, 0)
		);
		expect((await outreachRow(user, acute.outreachId))?.sendAt).toBeUndefined();

		await drain(user);
		const [late] = await deliveriesOf(user, deferred.outreachId);
		expect(late?.status).toBe("sent");
		expect(late?.sentAt).toBeGreaterThanOrEqual(Date.UTC(2026, 10, 14, 8, 0));
		expect(h.pushes).toHaveLength(2);
	});

	it.each([
		{
			// 23:30 EDT on the night clocks fall back: 08:00 the next day is EST.
			at: Date.UTC(2026, 10, 1, 3, 30),
			ends: Date.UTC(2026, 10, 1, 13, 0),
			name: "fall back",
		},
		{
			// 23:30 EST on the night clocks spring forward: 08:00 is EDT.
			at: Date.UTC(2027, 2, 14, 4, 30),
			ends: Date.UTC(2027, 2, 14, 12, 0),
			name: "spring forward",
		},
	])(
		"ends the quiet window at the local hour across a clock change ($name)",
		async ({ at, ends }) => {
			vi.setSystemTime(at);
			const user = await reachable();
			await setNotifications(user, {
				quietWindow: { dontReachAfter: 21, dontReachBefore: 8 },
				timezone: "America/New_York",
			});
			const { outreachId } = await enqueue(user);
			expect((await outreachRow(user, outreachId))?.sendAt).toBe(ends);
		}
	);

	it("finds an open escalation-derived card behind many ordinary ones", async () => {
		const user = await reachable();
		for (let i = 0; i < 60; i++) {
			await seedCard(user, { status: "superseded" });
		}
		await seedCard(user, { escalationDerived: true, status: "superseded" });
		expect(await enqueue(user)).toMatchObject({
			suppressedReason: "escalation_active",
		});
	});

	it("suppresses with no_channel when push is off and nothing else is linked", async () => {
		const user = await reachable();
		await setNotifications(user, { enabled: false });
		expect(await enqueue(user)).toMatchObject({
			suppressedReason: "no_channel",
		});
		await drain(user);
		expect(h.pushes).toHaveLength(0);
		expect(await user.t.query(api.notifications.list, {})).toHaveLength(0);
	});
});

describe("channel config", () => {
	it("routes nowhere when the push kill switch is off", async () => {
		const user = await reachable();
		await asAdmin(9, user.root).mutation(
			api.admin.outreachChannels.setChannelConfig,
			{ channel: "push", enabled: false, plan: "free" }
		);
		expect(await enqueue(user)).toMatchObject({
			suppressedReason: "no_channel",
		});
	});

	it("gates a Plus-only channel on the plan", async () => {
		const user = await reachable();
		await asAdmin(9, user.root).mutation(
			api.admin.outreachChannels.setChannelConfig,
			{ channel: "push", enabled: true, plan: "plus" }
		);
		expect(await enqueue(user)).toMatchObject({
			suppressedReason: "no_channel",
		});
		h.plus = true;
		expect(await enqueue(user, { intent: "achievement" })).toMatchObject({
			outcome: "queued",
		});
	});

	it("upserts one row per channel and rejects non-admins", async () => {
		const user = await reachable();
		const admin = asAdmin(9, user.root);
		await admin.mutation(api.admin.outreachChannels.setChannelConfig, {
			channel: "telegram",
			enabled: true,
			plan: "plus",
		});
		await admin.mutation(api.admin.outreachChannels.setChannelConfig, {
			channel: "telegram",
			enabled: false,
			plan: "free",
		});
		const rows = await user.root.run((ctx) =>
			ctx.db.query("outreach_channels").collect()
		);
		expect(rows).toEqual([
			expect.objectContaining({
				channel: "telegram",
				enabled: false,
				plan: "free",
			}),
		]);

		await expectCode(
			() =>
				asUser(1, user.root).mutation(
					api.admin.outreachChannels.setChannelConfig,
					{ channel: "telegram", enabled: true, plan: "free" }
				),
			"forbidden"
		);
	});

	it("never routes to Telegram without a configured bot", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		h.telegram.configured = false;
		await enqueue(user);
		await drain(user);
		expect(h.telegram.sends).toHaveLength(0);
		expect(h.pushes).toHaveLength(1);
	});

	it("routes to a relinked chat beside the revoked old one", async () => {
		const user = await reachable();
		await user.root.run((ctx) =>
			ctx.db.insert("channel_identities", {
				channel: "telegram",
				emotionalProfileId: user.profileId,
				externalId: "7",
				linkedAt: NOW - DAY,
				revokedAt: NOW - HOUR,
				revokedReason: "relinked",
				status: "revoked",
				tokenIdentifier: "test|7",
			})
		);
		await linkTelegram(user, ["telegram", "push"]);
		await enqueue(user);
		await drain(user);
		expect(h.telegram.sends).toHaveLength(1);
		expect(h.pushes).toHaveLength(0);
	});

	it("routes past a paused Telegram, and back once it's resumed (#767)", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		await user.t.mutation(api.outreach.reachMe.setChannelPaused, {
			channel: "telegram",
			paused: true,
		});
		await enqueue(user);
		await drain(user);
		expect(h.telegram.sends).toHaveLength(0);
		expect(h.pushes).toHaveLength(1);

		vi.advanceTimersByTime(DAY);
		await user.t.mutation(api.outreach.reachMe.setChannelPaused, {
			channel: "telegram",
			paused: false,
		});
		await enqueue(user);
		await drain(user);
		expect(h.telegram.sends).toHaveLength(1);
	});

	it("never routes to a revoked Telegram (#767)", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		await user.root.run(async (ctx) => {
			for (const identity of await ctx.db
				.query("channel_identities")
				.take(10)) {
				await ctx.db.patch("channel_identities", identity._id, {
					revokedAt: Date.now(),
					revokedReason: "blocked",
					status: "revoked",
				});
			}
		});
		await enqueue(user);
		await drain(user);
		expect(h.telegram.sends).toHaveLength(0);
		expect(h.pushes).toHaveLength(1);
	});

	it("keeps push-only intents off Telegram", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		await enqueue(user, { intent: "achievement" });
		await drain(user);
		expect(h.telegram.sends).toHaveLength(0);
		expect(h.pushes).toHaveLength(1);
	});

	it("tries first whichever channel the person put first (#766)", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		await user.t.mutation(api.outreach.reachMe.setFirstChannel, {
			channel: "push",
		});
		await enqueue(user);
		await drain(user);
		expect(h.pushes).toHaveLength(1);
		expect(h.telegram.sends).toHaveLength(0);

		vi.advanceTimersByTime(DAY);
		await user.t.mutation(api.outreach.reachMe.setFirstChannel, {
			channel: "telegram",
		});
		await enqueue(user);
		await drain(user);
		expect(h.telegram.sends).toHaveLength(1);
		expect(h.pushes).toHaveLength(1);
	});
});

describe("fallback", () => {
	it("routes to the first channel in the person's order", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		await enqueue(user);
		await drain(user);
		expect(h.telegram.sends).toEqual(["It's been a little while."]);
		expect(h.pushes).toHaveLength(0);
	});

	it("falls back once when the first channel is unreachable", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		h.telegram.failures.push(new ChannelError("unreachable", { code: "403" }));
		const { outreachId } = await enqueue(user);
		await drain(user);
		expect(h.pushes).toHaveLength(1);
		expect(await deliveriesOf(user, outreachId)).toEqual([
			expect.objectContaining({
				channel: "telegram",
				error: { code: "403", kind: "unreachable" },
				isFallback: false,
				status: "unreachable",
			}),
			expect.objectContaining({
				channel: "push",
				isFallback: true,
				status: "sent",
			}),
		]);
	});

	it("never falls back a second time", async () => {
		const user = await reachable();
		await linkTelegram(user, ["push", "telegram"]);
		h.pushFailures.push(new ChannelError("permanent"));
		h.telegram.failures.push(new ChannelError("permanent"));
		const { outreachId } = await enqueue(user);
		await drain(user);
		const deliveries = await deliveriesOf(user, outreachId);
		expect(deliveries.map((d) => [d.channel, d.status, d.isFallback])).toEqual([
			["push", "failed", false],
			["telegram", "failed", true],
		]);
	});

	it("doesn't fall back when the outreach was delivered", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		const { outreachId } = await enqueue(user);
		await drain(user);
		expect(await deliveriesOf(user, outreachId)).toHaveLength(1);
	});

	it("falls through to push once Telegram's three a day are spent", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		for (let i = 0; i < 3; i++) {
			await enqueue(user, { intent: "nudge", tier: "acute" });
		}
		await enqueue(user, { intent: "gentle_return" });
		await drain(user);
		expect(h.telegram.sends).toHaveLength(3);
		expect(h.pushes).toHaveLength(1);
	});

	it("never blocks an acute nudge on Telegram's cap", async () => {
		const user = await reachable();
		await linkTelegram(user, ["telegram", "push"]);
		await enqueue(user, { intent: "gentle_return" });
		await enqueue(user, { intent: "nudge", tier: "standard" });
		await enqueue(user, { intent: "nudge", tier: "acute" });
		await enqueue(user, { intent: "nudge", tier: "acute" });
		await drain(user);
		expect(h.telegram.sends).toHaveLength(4);
		expect(h.pushes).toHaveLength(0);
	});
});

describe("rollout stage 2: the push cutover (#764)", () => {
	const sources = import.meta.glob<string>(
		["../**/*.ts", "!../_generated/**", "!../**/*.test.ts", "!./**"],
		{ eager: true, import: "default", query: "?raw" }
	);
	const reachesOut = (text: string) =>
		text.includes("internal.outreach.enqueue.enqueue") ||
		text.includes("suppressionFor(");

	it("leaves no caller of the deprecated schedule", () => {
		expect(Object.keys(sources).length).toBeGreaterThan(50);
		const callers = Object.entries(sources)
			.filter(([, text]) => text.includes("internal.notifications.schedule"))
			.map(([path]) => path);
		expect(callers).toEqual([]);
	});

	it("leaves the quiet window, escalation and dormancy to the layer", () => {
		const callers = Object.entries(sources).filter(([, text]) =>
			reachesOut(text)
		);
		// The seven `schedule` call sites, the crons and the deprecated wrapper.
		expect(callers.length).toBeGreaterThanOrEqual(8);
		// What each of them used to read to gate itself.
		const gate =
			/quietWindow|inQuietWindow|escalation_events|by_profile_escalation_status|INACTIVE_THRESHOLD_MS/;
		const gating = callers
			.filter(([, text]) => gate.test(text))
			.map(([path]) => path);
		expect(gating).toEqual([]);
	});
});
