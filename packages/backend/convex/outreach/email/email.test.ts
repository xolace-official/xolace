// @vitest-environment edge-runtime
/**
 * #914: the email channel, driven through `enqueue` with the real rate
 * limiter and workpools. Clerk is faked at its HTTP boundary (`fetch`), the
 * Resend component at `./resend`. What can go wrong: the address lands on a
 * Xolace row; a repeat welcome sends twice; the kill switch, a deleted
 * account, the quiet window or the 72 h hold is applied wrongly; another
 * intent reaches email, or a failed email falls back somewhere; a Clerk or
 * Resend failure is mapped to the wrong outcome; staging emails a stranger.
 */
import workpoolTest from "@convex-dev/workpool/test";
import type { FunctionArgs } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimiterSchema from "../../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { expectCode, seedSession } from "../../test/fixtures.helpers";
import {
	asAdmin,
	asNewUser,
	makeIdentity,
	type SeededUser,
} from "../../test/harness.helpers";
import {
	aggregatesMock,
	noopJob,
	revenuecatMock,
} from "../../test/mocks.helpers";

type Queued = {
	from: string;
	html: string;
	idempotencyKey: string;
	replyTo?: string[];
	subject: string;
	text: string;
	to: string;
};

const h = vi.hoisted(() => ({
	/** Clerk's answers to the next user lookups, one each, in order. */
	clerk: [] as Response[],
	clerkCalls: [] as string[],
	pushes: [] as unknown[],
	queued: [] as Queued[],
	resendFailures: [] as Error[],
}));

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../revenuecat", () => revenuecatMock(false));
vi.mock("../../lib/pushNotifications", () => ({
	sendPushToProfile: async (_ctx: unknown, args: unknown) => {
		h.pushes.push(args);
		return 1;
	},
}));
vi.mock("../../streamSetup", async (orig) => ({
	...(await orig<typeof import("../../streamSetup")>()),
	addToXolaceChannel: noopJob(),
}));
vi.mock("./resend", () => ({
	queueEmail: async (_ctx: unknown, email: Queued) => {
		const failure = h.resendFailures.shift();
		if (failure) {
			throw failure;
		}
		h.queued.push(email);
		return `email_${h.queued.length}`;
	},
}));

const rateLimiterModules = import.meta.glob(
	"../../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts"
);

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 13, 12, 0);
const ADDRESS = "sam@example.com";
const FROM = "Xolace <hello@mail.xolaceinc.com>";
const REPLY_TO = "support@xolaceinc.com";

/** A Clerk user with a verified primary address. */
const clerkUser = (address = ADDRESS) =>
	Response.json({
		email_addresses: [
			{
				email_address: "old@example.com",
				id: "idn_old",
				verification: { status: "verified" },
			},
			{
				email_address: address,
				id: "idn_primary",
				verification: { status: "verified" },
			},
		],
		id: makeIdentity().subject,
		primary_email_address_id: "idn_primary",
	});

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	h.clerk.length = 0;
	h.clerkCalls.length = 0;
	h.pushes.length = 0;
	h.queued.length = 0;
	h.resendFailures.length = 0;
	vi.stubEnv("CLERK_SECRET_KEY", "sk_test_key");
	vi.stubEnv("RESEND_API_KEY", "re_test_key");
	vi.stubEnv("EMAIL_FROM", FROM);
	vi.stubEnv("EMAIL_REPLY_TO", REPLY_TO);
	vi.stubEnv("EMAIL_TEST_MODE", "false");
	vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
		const url = String(input);
		if (!url.startsWith("https://api.clerk.com/")) {
			throw new Error(`unexpected fetch: ${url}`);
		}
		h.clerkCalls.push(url);
		return h.clerk.shift() ?? clerkUser();
	});
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

/** A new user, with email switched on by an admin. */
async function signedUp(): Promise<SeededUser> {
	const user = await asNewUser();
	user.root.registerComponent(
		"rateLimiter",
		rateLimiterSchema,
		rateLimiterModules
	);
	workpoolTest.register(user.root, "outreachPush");
	workpoolTest.register(user.root, "outreachEmail");
	await setEmail(user, true);
	return user;
}

const setEmail = (user: SeededUser, enabled: boolean) =>
	asAdmin(9, user.root).mutation(api.admin.outreachChannels.setChannelConfig, {
		channel: "email",
		enabled,
		plan: "free",
	});

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

type EnqueueArgs = FunctionArgs<typeof internal.outreach.enqueue.enqueue>;

const welcome = (user: SeededUser, args: Partial<EnqueueArgs> = {}) =>
	user.root.mutation(internal.outreach.enqueue.enqueue, {
		content: { body: "Welcome to Xolace.", title: "Welcome to Xolace" },
		dedupeKey: `welcome:${user.profileId}`,
		emotionalProfileId: user.profileId,
		intent: "welcome",
		provenance: { triggerReason: "signed_up" },
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

describe("welcome", () => {
	it("sends one email to the Clerk address, keyed by its delivery, and stores no address", async () => {
		const user = await signedUp();

		const result = await welcome(user);
		await drain(user);

		expect(result.outcome).toBe("queued");
		const [delivery, ...others] = await deliveriesOf(user, result.outreachId);
		expect(others).toEqual([]);
		expect(delivery).toMatchObject({
			channel: "email",
			isFallback: false,
			providerMessageId: "email_1",
			status: "sent",
		});
		expect(h.clerkCalls).toEqual([
			`https://api.clerk.com/v1/users/${makeIdentity().subject}`,
		]);
		expect(h.queued).toHaveLength(1);
		expect(h.queued[0]).toMatchObject({
			from: FROM,
			idempotencyKey: delivery?._id,
			replyTo: [REPLY_TO],
			subject: "Welcome to Xolace",
			text: "Welcome to Xolace.",
			to: ADDRESS,
		});
		expect(h.queued[0]?.html).toContain("Xolace");
		expect(h.pushes).toEqual([]);
		const row = await outreachRow(user, result.outreachId);
		expect(JSON.stringify([row, delivery])).not.toContain(ADDRESS);
	});
});

describe("welcome gates", () => {
	it("sends nothing for a repeat with the same welcome key", async () => {
		const user = await signedUp();

		const first = await welcome(user);
		await drain(user);
		const second = await welcome(user);
		await drain(user);

		expect(second.outreachId).toBe(first.outreachId);
		expect(h.queued).toHaveLength(1);
	});

	it("is suppressed, and nothing sent, while the email channel is off", async () => {
		const user = await signedUp();
		await setEmail(user, false);

		const result = await welcome(user);
		await drain(user);

		expect(result).toMatchObject({
			outcome: "suppressed",
			suppressedReason: "no_channel",
		});
		expect(h.queued).toEqual([]);
		expect(h.clerkCalls).toEqual([]);
	});

	it("is suppressed when the deployment has no Resend key", async () => {
		const user = await signedUp();
		vi.stubEnv("RESEND_API_KEY", "");

		const result = await welcome(user);

		expect(result.suppressedReason).toBe("no_channel");
	});

	it("is account_deleted for a deleted account", async () => {
		const user = await signedUp();
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "deleted" })
		);

		const result = await welcome(user);
		await drain(user);

		expect(result).toMatchObject({
			outcome: "suppressed",
			suppressedReason: "account_deleted",
		});
		expect(h.queued).toEqual([]);
	});

	it("ignores the quiet window", async () => {
		// 23:30 UTC, inside a window that reaches people 08:00–21:59 only.
		vi.setSystemTime(Date.UTC(2026, 10, 13, 23, 30));
		const user = await signedUp();
		await setNotifications(user, {
			quietWindow: { dontReachAfter: 21, dontReachBefore: 8 },
			timezone: "UTC",
		});

		const result = await welcome(user);

		const row = await outreachRow(user, result.outreachId);
		expect(row?.sendAt).toBeUndefined();
		await drain(user);
		const [delivery] = await deliveriesOf(user, result.outreachId);
		expect(delivery?.status).toBe("sent");
	});

	it("ignores the 72 h escalation hold", async () => {
		const user = await signedUp();
		await seedEscalation(user, Date.now() - HOUR);

		const result = await welcome(user);
		await drain(user);

		expect(result.outcome).toBe("queued");
		expect(h.queued).toHaveLength(1);
	});

	it("takes no rate bucket", async () => {
		const user = await signedUp();

		const keys = ["a", "b", "c", "d"];
		for (const key of keys) {
			await welcome(user, { dedupeKey: `welcome:${key}` });
		}
		await drain(user);

		expect(h.queued).toHaveLength(keys.length);
	});
});

describe("routing", () => {
	it("never sends a push or Telegram intent by email", async () => {
		const user = await signedUp();

		const result = await user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "It's been a little while." },
			emotionalProfileId: user.profileId,
			intent: "gentle_return",
			provenance: { triggerReason: "test" },
		});
		await drain(user);

		// Push is off for a new user, and email doesn't take a gentle return.
		expect(result.suppressedReason).toBe("toggle_off");
		await setNotifications(user, { enabled: true, gentleReturn: true });
		const again = await user.root.mutation(internal.outreach.enqueue.enqueue, {
			content: { body: "It's been a little while." },
			emotionalProfileId: user.profileId,
			intent: "gentle_return",
			provenance: { triggerReason: "test" },
		});
		await drain(user);
		expect(again.outcome).toBe("queued");
		const deliveries = await deliveriesOf(user, again.outreachId);
		expect(deliveries.map((d) => d.channel)).toEqual(["push"]);
		expect(h.queued).toEqual([]);
	});

	it("never falls back from a failed email, even with push on", async () => {
		const user = await signedUp();
		await setNotifications(user, { enabled: true });
		vi.stubEnv("EMAIL_ALLOWLIST", "staff@xolaceinc.com");

		const result = await welcome(user);
		await drain(user);

		const deliveries = await deliveriesOf(user, result.outreachId);
		expect(deliveries).toHaveLength(1);
		expect(deliveries[0]?.status).toBe("failed");
		expect(h.pushes).toEqual([]);
	});
});

describe("delivery errors", () => {
	const deliveredOnce = async (user: SeededUser) => {
		const result = await welcome(user);
		await drain(user);
		const [delivery, ...others] = await deliveriesOf(user, result.outreachId);
		expect(others).toEqual([]);
		return delivery;
	};

	it.each([
		["Clerk has no such user", () => new Response(null, { status: 404 })],
		[
			"the user has no verified primary address",
			() =>
				Response.json({
					email_addresses: [
						{
							email_address: ADDRESS,
							id: "idn_primary",
							verification: { status: "unverified" },
						},
					],
					primary_email_address_id: "idn_primary",
				}),
		],
	])("ends unreachable when %s", async (_name, answer) => {
		const user = await signedUp();
		h.clerk.push(answer());

		const delivery = await deliveredOnce(user);

		expect(delivery).toMatchObject({
			error: { code: "no_address", kind: "unreachable" },
			status: "unreachable",
		});
		expect(h.queued).toEqual([]);
	});

	it.each([429, 503])("retries a Clerk %i, then sends", async (status) => {
		const user = await signedUp();
		h.clerk.push(new Response(null, { status }));

		const delivery = await deliveredOnce(user);

		expect(delivery).toMatchObject({ attempts: 2, status: "sent" });
		expect(h.clerkCalls).toHaveLength(2);
		expect(h.queued).toHaveLength(1);
	});

	it("fails a Clerk 4xx for good, with its status", async () => {
		const user = await signedUp();
		h.clerk.push(new Response(null, { status: 403 }));

		const delivery = await deliveredOnce(user);

		expect(delivery).toMatchObject({
			error: { code: "clerk_403", kind: "permanent" },
			status: "failed",
		});
	});

	it("retries a failed handover to Resend, then sends once", async () => {
		const user = await signedUp();
		h.resendFailures.push(new Error("Resend 503"));

		const delivery = await deliveredOnce(user);

		expect(delivery).toMatchObject({ attempts: 2, status: "sent" });
		expect(h.queued).toHaveLength(1);
		expect(h.queued[0]?.idempotencyKey).toBe(delivery?._id);
	});

	it("fails for good off the staging allowlist, and never calls Resend", async () => {
		const user = await signedUp();
		vi.stubEnv("EMAIL_ALLOWLIST", "staff@xolaceinc.com, ops@xolaceinc.com");

		const delivery = await deliveredOnce(user);

		expect(delivery).toMatchObject({
			error: { code: "not_allowlisted", kind: "permanent" },
			status: "failed",
		});
		expect(h.queued).toEqual([]);
	});

	it("sends to an address on the allowlist, whatever its case", async () => {
		const user = await signedUp();
		vi.stubEnv("EMAIL_ALLOWLIST", "staff@xolaceinc.com,SAM@example.com");

		const delivery = await deliveredOnce(user);

		expect(delivery?.status).toBe("sent");
		expect(h.queued[0]?.to).toBe(ADDRESS);
	});
});

describe("test mode", () => {
	it.each([
		["unset", undefined],
		["on", "true"],
	])("sends to Resend's test sink when it's %s", async (_name, value) => {
		const user = await signedUp();
		vi.stubEnv("EMAIL_TEST_MODE", value);

		await welcome(user);
		await drain(user);

		expect(h.queued.map((e) => e.to)).toEqual(["delivered@resend.dev"]);
	});
});

describe("admin", () => {
	it("lists the email switch with every channel, defaulting off", async () => {
		const user = await asNewUser();
		const admin = asAdmin(9, user.root);

		expect(
			await admin.query(api.admin.outreachChannels.listChannelConfigs, {})
		).toEqual([
			{ channel: "push", enabled: true, plan: "free" },
			{ channel: "telegram", enabled: false, plan: "free" },
			{ channel: "email", enabled: false, plan: "free" },
		]);

		await setEmail(user, true);
		const configs = await admin.query(
			api.admin.outreachChannels.listChannelConfigs,
			{}
		);
		expect(configs.find((c) => c.channel === "email")).toMatchObject({
			enabled: true,
			updatedAt: NOW,
		});
	});

	it("shows the email channel and a welcome's outcome in a user's outreach", async () => {
		const user = await signedUp();
		await welcome(user);
		await drain(user);

		const view = await asAdmin(9, user.root).mutation(
			api.admin.outreachView.viewUserOutreach,
			{ clerkUserId: makeIdentity().subject }
		);

		expect(view?.channels.find((c) => c.channel === "email")).toEqual({
			channel: "email",
			eligible: true,
			status: "active",
		});
		expect(view?.outreach).toEqual([
			{
				createdAt: expect.any(Number),
				deliveries: [
					{
						attemptedAt: expect.any(Number),
						channel: "email",
						isFallback: false,
						status: "sent",
					},
				],
				intent: "welcome",
				outcome: "queued",
			},
		]);
	});
});

describe("Reach me on… (store gap)", () => {
	it("never lists email, even switched on and configured", async () => {
		const user = await signedUp();
		await setNotifications(user, { enabled: true });

		const entries = await user.t.query(api.outreach.reachMe.listChannels, {});

		expect(entries.map((e) => e.channel)).toEqual(["push"]);
		expect(entries[0]?.isFirst).toBe(true);
	});

	it("can't put email first, pause it or unlink it", async () => {
		const user = await signedUp();

		await expectCode(
			() =>
				user.t.mutation(api.outreach.reachMe.setFirstChannel, {
					channel: "email",
				}),
			"channel_not_linked"
		);
		await expectCode(
			() =>
				user.t.mutation(api.outreach.reachMe.setChannelPaused, {
					channel: "email",
					paused: true,
				}),
			"channel_not_linkable"
		);
		await expectCode(
			() =>
				user.t.mutation(api.outreach.reachMe.unlinkChannel, {
					channel: "email",
				}),
			"channel_not_linkable"
		);
	});
});
