// @vitest-environment edge-runtime
/**
 * #915: the welcome, driven from `users.getOrCreate` with the real scheduler
 * and workpools. Clerk is faked at its HTTP boundary (`fetch`), the Resend
 * component at `./email/resend`. What can go wrong: the welcome goes out
 * mid-onboarding, twice, to an existing user, or after the account was
 * deleted; the subject or preview gives away what Xolace is for; the links
 * don't open the app; the footer loses its crisis resources.
 */
import workpoolTest from "@convex-dev/workpool/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { cancelWelcome } from "../test/fixtures.helpers";
import {
	asAdmin,
	asNewUser,
	makeIdentity,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, noopJob, revenuecatMock } from "../test/mocks.helpers";

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
	clerkCalls: [] as string[],
	queued: [] as Queued[],
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../streamSetup", async (orig) => ({
	...(await orig<typeof import("../streamSetup")>()),
	addToXolaceChannel: noopJob(),
}));
vi.mock("./email/resend", () => ({
	queueEmail: async (_ctx: unknown, email: Queued) => {
		h.queued.push(email);
		return `email_${h.queued.length}`;
	},
}));

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 10, 13, 12, 0);
const ADDRESS = "sam@example.com";
const SITE = "https://happy-otter-123.convex.site";

const clerkUser = () =>
	Response.json({
		email_addresses: [
			{
				email_address: ADDRESS,
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
	h.clerkCalls.length = 0;
	h.queued.length = 0;
	vi.stubEnv("CLERK_SECRET_KEY", "sk_test_key");
	vi.stubEnv("RESEND_API_KEY", "re_test_key");
	vi.stubEnv("EMAIL_TEST_MODE", "false");
	vi.stubEnv("CONVEX_SITE_URL", SITE);
	vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
		const url = String(input);
		if (!url.startsWith("https://api.clerk.com/")) {
			throw new Error(`unexpected fetch: ${url}`);
		}
		h.clerkCalls.push(url);
		return clerkUser();
	});
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

/** A new user signing up, with email switched on by an admin. */
async function signsUp(): Promise<SeededUser> {
	const user = await asNewUser();
	workpoolTest.register(user.root, "outreachEmail");
	await asAdmin(9, user.root).mutation(
		api.admin.outreachChannels.setChannelConfig,
		{ channel: "email", enabled: true, plan: "free" }
	);
	return user;
}

const signsInAgain = (user: SeededUser) =>
	user.t.mutation(api.users.getOrCreate, { authProvider: "apple" });

/** Run everything scheduled up to `ms` from now, and no further. */
async function after(user: SeededUser, ms: number) {
	vi.advanceTimersByTime(ms);
	await user.root.finishInProgressScheduledFunctions();
}

const drain = (user: SeededUser) =>
	user.root.finishAllScheduledFunctions(vi.runAllTimers);

const welcomesOf = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("outreach")
			.withIndex("by_profile_created", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);

const deliveriesOf = (user: SeededUser, outreachId: Id<"outreach">) =>
	user.root.run((ctx) =>
		ctx.db
			.query("outreach_deliveries")
			.withIndex("by_outreach", (q) => q.eq("outreachId", outreachId))
			.collect()
	);

describe("the welcome after sign-up", () => {
	it("sends one email to the Clerk address 30 minutes later, and stores no address", async () => {
		const user = await signsUp();

		await after(user, 29 * MINUTE);
		expect(await welcomesOf(user)).toEqual([]);
		await after(user, MINUTE);
		// Enqueued when the scheduled welcome ran: 30 minutes after sign-up.
		expect(await welcomesOf(user)).toMatchObject([
			{ createdAt: NOW + 30 * MINUTE, intent: "welcome" },
		]);
		await drain(user);

		expect(h.queued).toHaveLength(1);
		expect(h.queued[0]).toMatchObject({
			subject: "Welcome to Xolace",
			to: ADDRESS,
		});
		const [outreach, ...others] = await welcomesOf(user);
		expect(others).toEqual([]);
		expect(outreach).toMatchObject({
			content: { title: "Welcome to Xolace" },
			intent: "welcome",
			outcome: "queued",
		});
		if (!outreach) {
			throw new Error("no welcome outreach");
		}
		const deliveries = await deliveriesOf(user, outreach._id);
		expect(deliveries).toMatchObject([{ channel: "email", status: "sent" }]);
		expect(JSON.stringify([outreach, deliveries])).not.toContain(ADDRESS);
	});

	it("opens the app from its links, points at help in the footer, and keeps its preview neutral", async () => {
		const user = await signsUp();

		await drain(user);

		const [email] = h.queued;
		const appLinks = [
			`${SITE}/email/open/talk`,
			`${SITE}/email/open/vent`,
			`${SITE}/email/open/explore`,
		];
		const help = [
			`${SITE}/email/open/support`,
			"https://www.iasp.info/resources/Crisis_Centres/",
		];
		for (const part of [email?.html, email?.text]) {
			for (const link of [...appLinks, ...help]) {
				expect(part).toContain(link);
			}
			expect(part).toMatch(/gist/i);
			expect(part).toMatch(/recap/i);
			expect(part).toContain("Settings");
			expect(part).toContain("A person reads replies, not instantly");
		}
		// The one image, served by this deployment, not anyone else's host.
		expect(email?.html).toContain(`src="${SITE}/email/logo.png"`);
		expect(email?.html.match(/<img /g)).toHaveLength(1);
		const preview = email?.html
			.match(/data-skip-in-text="true">([^<]*)/)?.[1]
			?.replaceAll("&#x27;", "'");
		expect(preview).toBe("A few places to start, whenever you're ready.");
	});

	it("sends nothing more when they sign in again, before or after it went", async () => {
		const user = await signsUp();

		await signsInAgain(user);
		await drain(user);
		await signsInAgain(user);
		await drain(user);

		expect(h.queued).toHaveLength(1);
		expect(await welcomesOf(user)).toHaveLength(1);
	});

	it("sends nothing to someone who signed up before the welcome existed", async () => {
		const user = await signsUp();
		// What a sign-up from before #915 looks like: no welcome waiting.
		await cancelWelcome(user.root);

		await signsInAgain(user);
		await drain(user);

		expect(h.queued).toEqual([]);
		expect(await welcomesOf(user)).toEqual([]);
	});

	it("sends nothing, and records account_deleted, when they delete the account first", async () => {
		const user = await signsUp();

		await after(user, 10 * MINUTE);
		await user.t.mutation(api.users.requestDeletion, {});
		await drain(user);

		expect(h.queued).toEqual([]);
		expect(h.clerkCalls).toEqual([]);
		expect(await welcomesOf(user)).toMatchObject([
			{
				intent: "welcome",
				outcome: "suppressed",
				suppressedReason: "account_deleted",
			},
		]);
	});
});

describe("resending welcomes that crashed before they were recorded", () => {
	const resend = (
		user: SeededUser,
		args: { dryRun?: boolean; since: number }
	) => user.root.mutation(internal.outreach.welcome.resendMissedWelcomes, args);

	/** A sign-up whose scheduled welcome threw: nothing was recorded. */
	async function signsUpAndWelcomeCrashes(): Promise<SeededUser> {
		const user = await signsUp();
		await cancelWelcome(user.root);
		await after(user, 31 * MINUTE);
		return user;
	}

	it("counts by default, then sends the one missed welcome, and never a second", async () => {
		const user = await signsUpAndWelcomeCrashes();

		expect(await resend(user, { since: NOW })).toEqual({
			alreadyWelcomed: 0,
			dryRun: true,
			missed: [user.profileId],
			usersChecked: 1,
		});
		await drain(user);
		expect(h.queued).toEqual([]);

		await resend(user, { dryRun: false, since: NOW });
		await drain(user);
		expect(h.queued).toMatchObject([
			{ subject: "Welcome to Xolace", to: ADDRESS },
		]);

		expect(await resend(user, { dryRun: false, since: NOW })).toMatchObject({
			alreadyWelcomed: 1,
			missed: [],
		});
		await drain(user);
		expect(h.queued).toHaveLength(1);
		expect(await welcomesOf(user)).toHaveLength(1);
	});

	it("leaves out sign-ups from before `since`", async () => {
		const user = await signsUpAndWelcomeCrashes();

		expect(
			await resend(user, { dryRun: false, since: NOW + MINUTE })
		).toMatchObject({ missed: [], usersChecked: 0 });
		await drain(user);
		expect(h.queued).toEqual([]);
	});

	it("leaves a sign-up whose own welcome is still waiting to it", async () => {
		const user = await signsUp();

		await after(user, 10 * MINUTE);
		expect(await resend(user, { dryRun: false, since: NOW })).toMatchObject({
			missed: [],
			usersChecked: 0,
		});
		await drain(user);
		expect(h.queued).toHaveLength(1);
	});
});
