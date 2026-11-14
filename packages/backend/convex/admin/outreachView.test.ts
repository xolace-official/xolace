// @vitest-environment edge-runtime
/**
 * #775: the admin's read-only look at one user's channels and outreach.
 * Driven through the real link, routing and reply paths. What can go wrong:
 * a view leaves no audit row; a non-admin gets in; the result carries text,
 * a Telegram id or handle, a token or a hash; outreach outside the window or
 * past the cap comes back; a crisis detail leaks through a suppression.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { rateLimiter } from "../lib/rateLimits";
import {
	backend,
	configure,
	DAY,
	identities,
	linkChat,
	STRANGER_CHAT,
	setTelegram,
	stubTelegramEachTest,
} from "../outreach/telegram/telegram.helpers";
import { localDayKey } from "../streaks/activityLog";
import { seedSession } from "../test/fixtures.helpers";
import {
	asAdmin,
	asNewUser,
	asUser,
	makeIdentity,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../posthog", () => ({
	posthog: { capture: async () => undefined },
}));
vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(() => false));
vi.mock("../lib/pushNotifications", () => ({
	sendPushToProfile: async () => undefined,
}));

stubTelegramEachTest();
afterEach(() => {
	vi.restoreAllMocks();
});

const ADMIN = 9;
const clerkIdOf = (n: number) => makeIdentity(n).subject;

const view = (user: SeededUser, clerkUserId = clerkIdOf(1)) =>
	asAdmin(ADMIN, user.root).mutation(api.admin.outreachView.viewUserOutreach, {
		clerkUserId,
	});

const auditRows = (user: SeededUser) =>
	user.root.run((ctx) => ctx.db.query("admin_audit_log").take(20));

async function freshUser() {
	const user = await asNewUser();
	backend(user.root);
	return user;
}

describe("viewUserOutreach", () => {
	it("writes one audit row per view, naming the admin and whose outreach", async () => {
		const user = await freshUser();

		await view(user);
		await view(user);

		const rows = await auditRows(user);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			action: "outreach_viewed",
			adminClerkUserId: clerkIdOf(ADMIN),
			at: Date.now(),
			targetClerkUserId: clerkIdOf(1),
		});
	});

	it("returns push alone, eligible, for a user with nothing linked", async () => {
		const user = await freshUser();

		const result = await view(user);

		expect(result).toEqual({
			channels: [
				{
					channel: "push",
					eligible: false,
					ineligibleReason: "push_off",
					status: "app",
				},
			],
			outreach: [],
			suppressions: [],
			usage: {
				aiReplies: { cap: 5, used: 0 },
				telegramOutreach: { cap: 3, used: 0 },
			},
		});
	});

	it("rejects anyone without the admin role, and writes nothing", async () => {
		const user = await freshUser();

		await expect(
			asUser(2, user.root).mutation(api.admin.outreachView.viewUserOutreach, {
				clerkUserId: clerkIdOf(1),
			})
		).rejects.toThrow(/forbidden|Admin role required/);
		await expect(
			user.t.mutation(api.admin.outreachView.viewUserOutreach, {
				clerkUserId: clerkIdOf(1),
			})
		).rejects.toThrow(/forbidden|Admin role required/);

		expect(await auditRows(user)).toEqual([]);
	});

	it("returns null for a Clerk id with no user, and still audits the look", async () => {
		const user = await freshUser();

		expect(await view(user, "user_nobody")).toBeNull();

		expect(await auditRows(user)).toMatchObject([
			{ targetClerkUserId: "user_nobody" },
		]);
	});
});

describe("a linked Telegram user", () => {
	const CARD_BODY = "Work has been a lot since Tuesday's review.";
	const TELEGRAM_BODY = "Checking in about Tuesday.";
	const USER_TEXT = "Long day, but I walked it off.";
	const AI_TEXT = "That sounds like a lot to carry.";

	async function linked() {
		const user = await freshUser();
		const secret = await configure(user.root);
		await setTelegram(user, { enabled: true, plan: "free" });
		await linkChat(user, secret);
		await setNotifications(user, { enabled: true, gentleReturn: true });
		return user;
	}

	const setNotifications = (
		user: SeededUser,
		notifications: { enabled?: boolean; gentleReturn?: boolean }
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

	const enqueue = (user: SeededUser) =>
		user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: CARD_BODY, title: "Xolace" },
			emotionalProfileId: user.profileId,
			intent: "gentle_return",
			provenance: { triggerReason: "test" },
			variants: { telegram: { body: TELEGRAM_BODY } },
		});

	const linkedAtOf = async (user: SeededUser) =>
		(await identities(user))[0]?.linkedAt;

	/** Outreach rows written straight in, `ageMs` old. */
	const seedOutreach = (user: SeededUser, ageMs: number[]) =>
		user.root.run(async (ctx) => {
			for (const age of ageMs) {
				await ctx.db.insert("outreach", {
					content: { body: CARD_BODY },
					createdAt: Date.now() - age,
					emotionalProfileId: user.profileId,
					intent: "pattern_nudge",
					outcome: "suppressed",
					provenance: { triggerReason: "test" },
					suppressedReason: "escalation_active",
				});
			}
		});

	it("lists channels in the user's order with link state and eligibility", async () => {
		const user = await linked();

		const result = await view(user);

		expect(result?.channels).toEqual([
			{
				channel: "telegram",
				eligible: true,
				linkedAt: await linkedAtOf(user),
				status: "active",
			},
			{ channel: "push", eligible: true, status: "app" },
		]);
	});

	it("shows a revoked link with its reason and times", async () => {
		const user = await linked();
		const linkedAt = await linkedAtOf(user);
		vi.advanceTimersByTime(DAY);
		await user.t.mutation(api.outreach.reachMe.unlinkChannel, {
			channel: "telegram",
		});

		const result = await view(user);

		expect(result?.channels[0]).toEqual({
			channel: "telegram",
			eligible: false,
			ineligibleReason: "revoked",
			linkedAt,
			revokedAt: Date.now(),
			revokedReason: "user_app",
			status: "revoked",
		});
	});

	it("returns routed outreach with its delivery, and counts it against the Telegram day", async () => {
		const user = await linked();
		await enqueue(user);

		const result = await view(user);

		expect(result?.outreach).toEqual([
			{
				createdAt: Date.now(),
				deliveries: [
					{
						attemptedAt: expect.any(Number),
						channel: "telegram",
						isFallback: false,
						status: expect.any(String),
					},
				],
				intent: "gentle_return",
				outcome: "queued",
			},
		]);
		expect(result?.usage.telegramOutreach).toEqual({ cap: 3, used: 1 });
	});

	it("reports a full Telegram day as bucket_full", async () => {
		const user = await linked();
		await enqueue(user);
		// Two more Telegram sends today (a single intent's own bucket allows one).
		await user.root.run(async (ctx) => {
			for (let i = 0; i < 2; i++) {
				await rateLimiter.limit(ctx, "outreachTelegram", {
					key: user.profileId,
				});
			}
		});

		const result = await view(user);

		expect(result?.usage.telegramOutreach).toEqual({ cap: 3, used: 3 });
		expect(result?.channels[0]).toMatchObject({
			eligible: false,
			ineligibleReason: "bucket_full",
		});
	});

	it("keeps the last 30 days, newest first, at most 50", async () => {
		const user = await linked();
		await seedOutreach(user, [31 * DAY, 2 * DAY, DAY]);

		const recent = await view(user);
		expect(recent?.outreach.map((o) => o.createdAt)).toEqual([
			Date.now() - DAY,
			Date.now() - 2 * DAY,
		]);

		await seedOutreach(
			user,
			Array.from({ length: 60 }, (_, i) => i)
		);
		expect((await view(user))?.outreach).toHaveLength(50);
	});

	it("names a crisis hold only as safety", async () => {
		const user = await linked();
		await seedOutreach(user, [DAY]);

		const result = await view(user);

		expect(result?.outreach[0]?.suppressedReason).toBe("safety");
	});

	it("counts today's AI replies against the plan's cap", async () => {
		const user = await linked();
		await user.root.run(async (ctx) => {
			const [identity] = await ctx.db
				.query("channel_identities")
				.withIndex("by_profile_channel", (q) =>
					q.eq("emotionalProfileId", user.profileId).eq("channel", "telegram")
				)
				.take(1);
			if (identity) {
				await ctx.db.patch("channel_identities", identity._id, {
					replyCount: {
						count: 2,
						// The test profile keeps the default UTC timezone.
						day: localDayKey(Date.now(), "UTC"),
						emotionalProfileId: user.profileId,
					},
				});
			}
		});

		const result = await view(user);

		expect(result?.usage.aiReplies).toEqual({ cap: 5, used: 2 });
	});

	it("never returns text, a Telegram id or handle, a token or a hash", async () => {
		const user = await linked();
		await enqueue(user);
		// What the chat holds: the user's text and the AI's reply.
		const secrets = await user.root.run(async (ctx) => {
			const [identity] = await ctx.db
				.query("channel_identities")
				.withIndex("by_profile_channel", (q) =>
					q.eq("emotionalProfileId", user.profileId).eq("channel", "telegram")
				)
				.take(1);
			if (!identity) {
				throw new Error("not linked");
			}
			await ctx.db.patch("channel_identities", identity._id, {
				recentTurns: [
					{ at: Date.now(), role: "person", text: USER_TEXT },
					{ at: Date.now(), role: "xolace", text: AI_TEXT },
				],
			});
			const [token] = await ctx.db
				.query("channel_link_tokens")
				.withIndex("by_profile_channel", (q) =>
					q.eq("emotionalProfileId", user.profileId).eq("channel", "telegram")
				)
				.take(1);
			const userRow = await ctx.db.get("users", user.userId);
			return {
				displayHandle: identity.displayHandle,
				externalId: identity.externalId,
				tokenHash: token?.tokenHash,
				tokenIdentifier: userRow?.tokenIdentifier,
			};
		});
		expect(secrets.displayHandle).toBe("sam_t");

		const sent = JSON.stringify(await view(user));

		for (const forbidden of [
			CARD_BODY,
			TELEGRAM_BODY,
			USER_TEXT,
			AI_TEXT,
			"Xolace",
			String(STRANGER_CHAT),
			secrets.externalId,
			secrets.displayHandle,
			secrets.tokenHash,
			secrets.tokenIdentifier,
			user.profileId,
			"123456:test-token",
		]) {
			expect(forbidden).toBeTruthy();
			expect(sent).not.toContain(forbidden);
		}
	});
});

describe("suppressions", () => {
	it("shows a recent escalation as safety, ending 72 h after it", async () => {
		const user = await freshUser();
		const raisedAt = Date.now() - 10 * 3_600_000;
		const sessionId = await seedSession(user.root, user.profileId);
		await user.root.run((ctx) =>
			ctx.db.insert("escalation_events", {
				actionTaken: "resources_shown",
				createdAt: raisedAt,
				emotionalProfileId: user.profileId,
				resourcesPresented: [],
				reviewedByHuman: false,
				sessionId,
				triggerConfidence: 0.9,
				triggerEvidence: "test",
				triggerType: "explicit_crisis_language",
			})
		);

		const result = await view(user);

		expect(result?.suppressions).toEqual([
			{ endsAt: raisedAt + 72 * 3_600_000, kind: "safety" },
		]);
	});

	it("shows 30 days without a session as dormancy, with no end time", async () => {
		const user = await freshUser();
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				lastSessionAt: Date.now() - 31 * DAY,
			})
		);

		const result = await view(user);

		expect(result?.suppressions).toEqual([{ kind: "dormancy" }]);
	});
});
