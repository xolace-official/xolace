// @vitest-environment edge-runtime
/**
 * #764: the push cutover. Every push outreach reaches `enqueue`, through the
 * callers' own entry points. What can go wrong: a `schedule` call scheduled
 * before the deploy (old args) is dropped instead of delivered; a sleeping
 * follow-up workflow's nudge (unchanged args) stops landing; a caller still
 * drops what the layer should defer or suppress; a suppression still writes
 * `notification_log`; the new readers miss what the layer sent.
 */
import workpoolTest from "@convex-dev/workpool/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimiterSchema from "../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, noopJob, revenuecatMock } from "../test/mocks.helpers";

type Sent = {
	emotionalProfileId: string;
	notification: {
		body: string;
		data: { logId: string; type: string };
		title: string;
	};
};
const pushes = vi.hoisted(() => [] as Sent[]);

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../lib/pushNotifications", () => ({
	sendPushToProfile: async (_ctx: unknown, args: Sent) => {
		pushes.push(args);
	},
}));
vi.mock("../streamSetup", async (orig) => ({
	...(await orig<typeof import("../streamSetup")>()),
	addToXolaceChannel: noopJob(),
}));

const rateLimiterModules = import.meta.glob(
	"../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts"
);

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// 12:00 UTC on a Friday.
const NOW = Date.UTC(2026, 10, 13, 12, 0);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	pushes.length = 0;
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

async function reachable(): Promise<SeededUser> {
	const user = await asNewUser();
	user.root.registerComponent(
		"rateLimiter",
		rateLimiterSchema,
		rateLimiterModules
	);
	workpoolTest.register(user.root, "outreachPush");
	await setNotifications(user, {
		achievement: true,
		enabled: true,
		gentleReturn: true,
		milestone: true,
		patternNudge: true,
	});
	return user;
}

/** Quiet from 22:00 to 08:00 UTC: 12:00 is open, 23:00 is quiet. */
const QUIET_NIGHTS = {
	quietWindow: { dontReachAfter: 21, dontReachBefore: 8 },
	timezone: "UTC",
};

const drain = (user: SeededUser) =>
	user.root.finishAllScheduledFunctions(vi.runAllTimers);

/** Hops a delivery takes through the workpool: enqueue, its loop, the send. */
const DELIVERY_HOPS = 10;

/**
 * Run what's due now, a second at a time. `drain` would also run the
 * workpool's idle loop, which carries the clock a week on.
 */
async function deliverSoon(user: SeededUser) {
	for (let hop = 0; hop < DELIVERY_HOPS; hop++) {
		vi.advanceTimersByTime(1000);
		await user.root.finishInProgressScheduledFunctions();
	}
}

const outreachRows = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("outreach")
			.withIndex("by_profile_created", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.take(50)
	);

const logRows = (user: SeededUser) =>
	user.root.run((ctx) => ctx.db.query("notification_log").take(50));

async function seedCard(
	user: SeededUser,
	overrides: Partial<Doc<"follow_up_cards">> = {}
) {
	const sessionId = await seedSession(user.root, user.profileId);
	const workflowId = `wf_${sessionId}` as Doc<"follow_up_cards">["workflowId"];
	const cardId = await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: "Your last session sounded heavy.",
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			status: "pending",
			tier: "standard",
			workflowId,
			...overrides,
		})
	);
	return { cardId, workflowId };
}

describe("schedule, deprecated (#764)", () => {
	it("delivers an old-args follow_up call through the layer as a nudge", async () => {
		const user = await reachable();
		await user.root.mutation(internal.notifications.schedule, {
			content: "How's it sitting now?",
			emotionalProfileId: user.profileId,
			followUpTier: "elevated",
			scheduledFor: Date.now(),
			triggerReason: "follow_up_elevated",
			type: "follow_up",
		});
		await drain(user);

		expect(pushes.map((p) => p.notification.data.type)).toEqual(["follow_up"]);
		const [row] = await outreachRows(user);
		expect(row).toMatchObject({
			intent: "nudge",
			outcome: "queued",
			tier: "elevated",
		});
		const logs = await logRows(user);
		expect(logs).toHaveLength(1);
		expect(logs[0]?.outreachId).toBe(row?._id);
	});

	it("lets an old-args acute follow_up through its own open escalation card's hold", async () => {
		const user = await reachable();
		const { cardId } = await seedCard(user, {
			escalationDerived: true,
			tier: "acute",
		});
		await user.root.mutation(internal.notifications.schedule, {
			content: "Checking in after last night.",
			emotionalProfileId: user.profileId,
			followUpTier: "acute",
			scheduledFor: Date.now(),
			triggerReason: "follow_up_acute",
			type: "follow_up",
		});
		await drain(user);

		const [row] = await outreachRows(user);
		expect(row).toMatchObject({
			followUpId: cardId,
			intent: "nudge",
			outcome: "queued",
		});
		expect(pushes.map((p) => p.notification.data.type)).toEqual(["follow_up"]);
	});

	it("maps affirmation to a gentle return with provenance.affirmation", async () => {
		const user = await reachable();
		await user.root.mutation(internal.notifications.schedule, {
			content: "Being tired doesn't mean you're failing.",
			emotionalProfileId: user.profileId,
			reachUsed: "warm",
			scheduledFor: Date.now(),
			title: "Hey",
			triggerReason: "aff",
			type: "affirmation",
		});
		await drain(user);

		const [row] = await outreachRows(user);
		expect(row).toMatchObject({
			content: {
				body: "Being tired doesn't mean you're failing.",
				title: "Hey",
			},
			intent: "gentle_return",
			provenance: {
				affirmation: true,
				reachUsed: "warm",
				triggerReason: "aff",
			},
		});
		expect(pushes.map((p) => p.notification.data.type)).toEqual([
			"affirmation",
		]);
	});

	it("sends nothing for streak_milestone", async () => {
		const user = await reachable();
		await user.root.mutation(internal.notifications.schedule, {
			content: "7 days.",
			emotionalProfileId: user.profileId,
			scheduledFor: Date.now(),
			triggerReason: "streak",
			type: "streak_milestone",
		});
		await drain(user);
		expect(pushes).toEqual([]);
		expect(await logRows(user)).toEqual([]);
	});
});

describe("the follow-up nudge sender (#764)", () => {
	it("still delivers from a sleeping workflow's unchanged args, one key per nudge", async () => {
		const user = await reachable();
		const { cardId, workflowId } = await seedCard(user, { tier: "acute" });
		await user.root.mutation(internal.followUps.sendFollowUpNudge, {
			workflowId,
		});
		await user.root.mutation(internal.followUps.sendFollowUpNudge, {
			workflowId,
		});
		await drain(user);

		expect(pushes.map((p) => p.notification.data.type)).toEqual([
			"follow_up",
			"follow_up",
		]);
		const rows = await outreachRows(user);
		expect(rows.map((r) => [r.intent, r.followUpId, r.dedupeKey])).toEqual([
			["nudge", cardId, `nudge:${cardId}:1`],
			["nudge", cardId, `nudge:${cardId}:2`],
		]);
	});

	it("defers a standard nudge in the quiet window instead of sending it", async () => {
		const user = await reachable();
		await setNotifications(user, QUIET_NIGHTS);
		vi.setSystemTime(NOW + 11 * HOUR); // 23:00 UTC
		const { workflowId } = await seedCard(user);
		await user.root.mutation(internal.followUps.sendFollowUpNudge, {
			workflowId,
		});

		const [row] = await outreachRows(user);
		expect(row?.sendAt).toBe(NOW + 20 * HOUR); // 08:00 the next day
		await drain(user);
		expect(pushes).toHaveLength(1);
	});

	it("leaves the toggle to the layer: gentle return off records toggle_off", async () => {
		const user = await reachable();
		await setNotifications(user, { gentleReturn: false });
		const { workflowId } = await seedCard(user);
		await user.root.mutation(internal.followUps.sendFollowUpNudge, {
			workflowId,
		});
		await drain(user);

		expect(pushes).toEqual([]);
		expect((await outreachRows(user)).map((r) => r.suppressedReason)).toEqual([
			"toggle_off",
		]);
	});
});

async function completedSession(user: SeededUser) {
	return await seedSession(user.root, user.profileId, { state: "completed" });
}

describe("the session-count milestone (#764)", () => {
	it("goes through the layer once per count", async () => {
		const user = await reachable();
		const sessionId = await completedSession(user);
		await user.root.mutation(internal.jobs.profileStats.updateAfterSession, {
			emotionalProfileId: user.profileId,
			sessionId,
		});
		await drain(user);

		expect(pushes.map((p) => p.notification.data.type)).toEqual(["milestone"]);
		expect((await outreachRows(user)).map((r) => r.dedupeKey)).toEqual([
			`milestone:${user.profileId}:1`,
		]);
	});
});

describe("session attribution reads the layer (#764)", () => {
	it("marks the outreach a push delivered in the last day, and its log row", async () => {
		const user = await reachable();
		await user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "It's been a little while." },
			emotionalProfileId: user.profileId,
			intent: "gentle_return",
			provenance: { triggerReason: "test" },
		});
		await deliverSoon(user);
		vi.setSystemTime(Date.now() + 2 * HOUR);

		const sessionId = await completedSession(user);
		await user.root.mutation(internal.jobs.profileStats.updateAfterSession, {
			emotionalProfileId: user.profileId,
			sessionId,
		});

		const sent = (await outreachRows(user)).find(
			(r) => r.intent === "gentle_return"
		);
		expect(sent?.resultedInSession).toBe(true);
		const log = (await logRows(user)).find((r) => r.outreachId === sent?._id);
		expect(log?.resultedInSession).toBe(true);
	});

	it("leaves an outreach that was suppressed alone", async () => {
		const user = await reachable();
		await setNotifications(user, { gentleReturn: false });
		await user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "It's been a little while." },
			emotionalProfileId: user.profileId,
			intent: "gentle_return",
			provenance: { triggerReason: "test" },
		});
		const sessionId = await completedSession(user);
		await user.root.mutation(internal.jobs.profileStats.updateAfterSession, {
			emotionalProfileId: user.profileId,
			sessionId,
		});
		const suppressed = (await outreachRows(user)).find(
			(r) => r.intent === "gentle_return"
		);
		expect(suppressed?.resultedInSession).toBeUndefined();
	});

	it("a push tap marks the outreach too", async () => {
		const user = await reachable();
		await user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "It's been a little while." },
			emotionalProfileId: user.profileId,
			intent: "gentle_return",
			provenance: { triggerReason: "test" },
		});
		await drain(user);
		const [log] = await logRows(user);
		await user.t.mutation(api.notifications.markResultedInSession, {
			logId: log!._id,
		});
		const [row] = await outreachRows(user);
		expect(row?.resultedInSession).toBe(true);
	});
});

describe("notification generation (#764)", () => {
	it("sends the true intent, with an affirmation as provenance", async () => {
		const user = await reachable();
		// Always swap in an affirmation; a cold-start user gets a template.
		vi.spyOn(Math, "random").mockReturnValue(0);
		await user.root.action(internal.ai.generateNotification.generate, {
			emotionalProfileId: user.profileId,
			notificationType: "pattern_nudge",
			scheduledFor: NOW,
			triggerReason: "Pattern match",
		});
		await drain(user);
		vi.mocked(Math.random).mockRestore();

		const [row] = await outreachRows(user);
		expect(row).toMatchObject({
			dedupeKey: `pattern_nudge:${user.profileId}:${NOW}`,
			intent: "pattern_nudge",
			provenance: { affirmation: true, generatedBy: "template_cold_start" },
		});
		expect(pushes.map((p) => p.notification.data.type)).toEqual([
			"affirmation",
		]);
	});

	it("de-duplicates copy against what the layer holds, deferred included", async () => {
		const user = await reachable();
		await setNotifications(user, QUIET_NIGHTS);
		vi.setSystemTime(NOW + 11 * HOUR); // quiet: deferred, not yet sent
		await user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "Sunday evenings have been heavy." },
			emotionalProfileId: user.profileId,
			intent: "pattern_nudge",
			provenance: { triggerReason: "test" },
		});
		const context = await user.root.query(
			internal.notifications.loadGenerationContext,
			{ emotionalProfileId: user.profileId }
		);
		expect(context?.recentNotificationContent).toEqual([
			"Sunday evenings have been heavy.",
		]);
	});
});

describe("the gentle-return and pattern crons (#764)", () => {
	const generations = (user: SeededUser) =>
		user.root.run(async (ctx) =>
			(await ctx.db.system.query("_scheduled_functions").take(100)).filter(
				(f) => f.name.includes("generateNotification")
			)
		);

	async function lapsed(user: SeededUser) {
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				lastSessionAt: Date.now() - 3 * DAY,
			})
		);
	}

	it("still writes a gentle return in the quiet window; the layer defers it", async () => {
		const user = await reachable();
		await lapsed(user);
		await setNotifications(user, QUIET_NIGHTS);
		vi.setSystemTime(NOW + 11 * HOUR);
		await user.root.mutation(
			internal.jobs.notificationTriggers.checkGentleReturn,
			{}
		);
		expect(await generations(user)).toHaveLength(1);
	});

	it("asks the layer first: no copy is written while an escalation holds", async () => {
		const user = await reachable();
		await lapsed(user);
		await seedCard(user, { escalationDerived: true });
		await user.root.mutation(
			internal.jobs.notificationTriggers.checkGentleReturn,
			{}
		);
		expect(await generations(user)).toEqual([]);
	});

	it("asks the layer first: no copy is written for someone push can't reach", async () => {
		const user = await reachable();
		await lapsed(user);
		await setNotifications(user, { enabled: false });
		await user.root.mutation(
			internal.jobs.notificationTriggers.checkGentleReturn,
			{}
		);
		expect(await generations(user)).toEqual([]);
	});
});
