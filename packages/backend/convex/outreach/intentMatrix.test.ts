// @vitest-environment edge-runtime
/**
 * #763: the push intent matrix, written as the baseline for the push cutover
 * (#760 rollout stage 2) and kept green through it (#764). One row per
 * intent, sent through `notifications.schedule` (now the deprecated wrapper,
 * which old-args calls scheduled before the deploy still reach) and through
 * `outreach.enqueue`, recording what the outside world sees: the push
 * payload, its old `type` literal, one `notification_log` row per push, and
 * how many pushes a day's bucket lets through. The recorded nudge payload and
 * the follow-up nudge copy pin today's push against drift.
 *
 * The only differences allowed (#760): suppressions leave `notification_log`
 * (ADR 0001); quiet-window deferral, escalation suppression and the global
 * toggle are exercised in enqueue.test.ts and cutover.test.ts.
 */
import workpoolTest from "@convex-dev/workpool/test";
import type { FunctionArgs } from "convex/server";
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
		channelId: string;
		data: { logId: string; type: string };
		sound: string;
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

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(Date.UTC(2026, 10, 13, 12, 0));
	pushes.length = 0;
});
afterEach(() => vi.useRealTimers());

async function reachable(): Promise<SeededUser> {
	const user = await asNewUser();
	user.root.registerComponent(
		"rateLimiter",
		rateLimiterSchema,
		rateLimiterModules
	);
	workpoolTest.register(user.root, "outreachPush");
	await user.root.run(async (ctx) => {
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
			notifications: {
				...p.notifications,
				achievement: true,
				enabled: true,
				gentleReturn: true,
				milestone: true,
				patternNudge: true,
			},
		});
	});
	return user;
}

type ScheduleArgs = FunctionArgs<typeof internal.notifications.schedule>;
type EnqueueArgs = FunctionArgs<typeof internal.outreach.enqueue.enqueue>;

type Row = {
	name: string;
	schedule: Omit<ScheduleArgs, "emotionalProfileId" | "scheduledFor">;
	enqueue: Omit<EnqueueArgs, "emotionalProfileId">;
	/** Pushes a day's bucket lets through out of four tries. */
	perDay: number;
};

const provenance = {
	generatedBy: "haiku_personalized" as const,
	patternContextUsed: true,
	reachUsed: "warm" as const,
};

const ROWS: Row[] = [
	...(["standard", "elevated", "acute"] as const).map((tier) => ({
		enqueue: {
			content: { body: "How's it sitting now?" },
			intent: "nudge" as const,
			provenance: { triggerReason: `follow_up_${tier}` },
			tier,
		},
		name: `nudge (${tier})`,
		perDay: tier === "acute" ? 3 : 1,
		schedule: {
			content: "How's it sitting now?",
			followUpTier: tier,
			triggerReason: `follow_up_${tier}`,
			type: "follow_up" as const,
		},
	})),
	...(["gentle_return", "pattern_nudge", "milestone"] as const).map(
		(intent) => ({
			enqueue: {
				content: { body: "Sunday evenings have been heavy." },
				intent,
				provenance: { ...provenance, triggerReason: intent },
			},
			name: intent,
			perDay: 1,
			schedule: {
				content: "Sunday evenings have been heavy.",
				...provenance,
				triggerReason: intent,
				type: intent,
			},
		})
	),
	{
		enqueue: {
			content: { body: "Being tired doesn't mean you're failing." },
			intent: "gentle_return",
			provenance: { ...provenance, affirmation: true, triggerReason: "aff" },
		},
		name: "affirmation",
		perDay: 1,
		schedule: {
			content: "Being tired doesn't mean you're failing.",
			...provenance,
			triggerReason: "aff",
			type: "affirmation",
		},
	},
	{
		enqueue: {
			content: { body: "Your kindling is ready." },
			intent: "kindling_ready",
			provenance: { triggerReason: "kindling_generated" },
		},
		name: "kindling_ready",
		perDay: 1,
		schedule: {
			content: "Your kindling is ready.",
			triggerReason: "kindling_generated",
			type: "kindling_ready",
		},
	},
	{
		enqueue: {
			content: {
				body: "Part of your Insights has come into focus.",
				title: "Something new is ready.",
			},
			intent: "domain_unlock",
			provenance: { triggerReason: "domain_unlock_missed" },
		},
		name: "domain_unlock",
		perDay: 1,
		schedule: {
			content: "Part of your Insights has come into focus.",
			title: "Something new is ready.",
			triggerReason: "domain_unlock_missed",
			type: "domain_unlock",
		},
	},
	{
		enqueue: {
			content: { body: "You earned a badge.", title: "Ten days" },
			intent: "achievement",
			provenance: { triggerReason: "achievement_missed" },
		},
		name: "achievement",
		perDay: 1,
		schedule: {
			content: "You earned a badge.",
			title: "Ten days",
			triggerReason: "achievement_missed",
			type: "achievement",
		},
	},
];

const TRIES = 4;

/** What the outside world sees, minus ids and clocks. */
async function observe(user: SeededUser) {
	await user.root.finishAllScheduledFunctions(vi.runAllTimers);
	const log = await user.t.query(api.notifications.list, {});
	const delivered = log.filter((row) => row.delivered);
	const payloads = pushes.map(({ notification }) => {
		const { data, ...rest } = notification;
		const logRow = delivered.find((row) => row._id === data.logId);
		return { ...rest, data: { hasLogRow: Boolean(logRow), type: data.type } };
	});
	const rows = delivered.map(
		({
			_creationTime,
			_id,
			createdAt,
			outreachId: _outreachId,
			scheduledFor,
			sentAt,
			...row
		}) => row
	);
	pushes.length = 0;
	return { log, payloads, rows };
}

describe.each(ROWS)("$name", (row) => {
	it("sends the same push through enqueue as through schedule", async () => {
		const before = await reachable();
		for (let i = 0; i < TRIES; i++) {
			await before.root.mutation(internal.notifications.schedule, {
				...row.schedule,
				emotionalProfileId: before.profileId,
				scheduledFor: Date.now(),
			});
		}
		const today = await observe(before);

		const after = await reachable();
		for (let i = 0; i < TRIES; i++) {
			await after.root.mutation(internal.outreach.enqueue.enqueue, {
				...row.enqueue,
				emotionalProfileId: after.profileId,
			});
		}
		const layer = await observe(after);

		expect(today.payloads).toHaveLength(row.perDay);
		expect(layer.payloads).toEqual(today.payloads);
		expect(layer.rows).toEqual(today.rows);
		// One log row per push; suppressions are recorded on `outreach` only.
		expect(layer.log).toHaveLength(row.perDay);
		expect(layer.log.every((r) => r.outreachId)).toBe(true);
	});
});

it("matches the recorded payload for a nudge", async () => {
	const user = await reachable();
	await user.root.mutation(internal.notifications.schedule, {
		...ROWS[0]!.schedule,
		emotionalProfileId: user.profileId,
		scheduledFor: Date.now(),
	});
	expect((await observe(user)).payloads).toEqual([
		{
			body: "How's it sitting now?",
			channelId: "nudge",
			data: { hasLogRow: true, type: "follow_up" },
			sound: "nudge.wav",
			title: "Xolace",
		},
	]);
});

describe("follow-up nudge copy (today's caller)", () => {
	const cases: {
		name: string;
		card: Partial<Doc<"follow_up_cards">>;
		body: string;
	}[] = [
		{
			body: "Your last session sounded heavy.",
			card: { cardText: "Your last session sounded heavy.", tier: "standard" },
			name: "standard: the card text",
		},
		{
			body: "Your last session sounded heavy.",
			card: { cardText: "Your last session sounded heavy.", tier: "elevated" },
			name: "elevated: the card text",
		},
		{
			body: "A little while ago you let something out here. How's it sitting now?",
			card: {
				cardText: "You've brought work here a few times lately.",
				compoundingDomain: "work",
				tier: "standard",
			},
			name: "compounding: generic, never the domain",
		},
		{
			body: "Just checking in on what you worked through a little while ago. We're here.",
			card: { cardText: "Your last session sounded heavy.", tier: "acute" },
			name: "acute: the fixed line",
		},
	];

	it.each(cases)("$name", async ({ body, card }) => {
		const user = await reachable();
		const sessionId = await seedSession(user.root, user.profileId);
		const workflowId =
			`wf_${sessionId}` as Doc<"follow_up_cards">["workflowId"];
		await user.root.run((ctx) =>
			ctx.db.insert("follow_up_cards", {
				cardText: "",
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
		await user.root.mutation(internal.followUps.sendFollowUpNudge, {
			workflowId,
		});
		const { payloads } = await observe(user);
		expect(payloads.map((p) => p.body)).toEqual([body]);
	});
});
