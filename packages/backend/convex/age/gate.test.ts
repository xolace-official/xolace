// @vitest-environment edge-runtime
/**
 * The Xolacer-chat age gate (#716): who may ask for a chat, publish a Xolacer
 * profile, or accept a request, read from the effective age status.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { V1_ANSWERS } from "../intake/fixtures.helpers";
import { expectCode } from "../test/fixtures.helpers";
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
vi.mock("../integrations/stream", async (orig) => ({
	...(await orig<typeof import("../integrations/stream")>()),
	createXolacerChannel: async () => {},
	upsertStreamUsers: async () => {},
}));

// 2026-11-04 12:00 UTC.
const NOW = Date.UTC(2026, 10, 4, 12);
const ADULT = "1990-05-01";
const TEEN = "2010-05-01";
const CHILD = "2016-05-01";
const CLIENT_VERSION = "1.15.0";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	process.env.XOLACER_CHAT_ENABLED = "true";
});
afterEach(() => vi.useRealTimers());

const declare = (user: SeededUser, dateOfBirth: string) =>
	user.t.mutation(api.age.declarations.declare, {
		dateOfBirth,
		platform: "ios",
		promptVersion: "xolacer_chat.v1",
		surface: "xolacer_chat",
	});

/** A published, active Xolacer on `root`'s backend. */
async function aXolacer(seeker: SeededUser, n = 2) {
	const xolacer = await asNewUser(n, seeker.root);
	await seeker.root.run(async (ctx) => {
		await ctx.db.patch("users", xolacer.userId, { isXolacer: true });
		await ctx.db.insert("xolacer_profiles", {
			active: true,
			bio: "Here to listen.",
			complete: true,
			createdAt: Date.now(),
			displayName: "River",
			emotionalProfileId: xolacer.profileId,
			photoUrl: "https://example.com/river.jpg",
			specialties: ["anxiety"],
			updatedAt: Date.now(),
		});
	});
	return xolacer;
}

/** A current client: it sends its version, so it can show the date-of-birth step. */
const request = (seeker: SeededUser, xolacer: SeededUser) =>
	seeker.t.mutation(api.xolacerChat.requestConversation, {
		clientVersion: CLIENT_VERSION,
		xolacerProfileId: xolacer.profileId,
	});

/** A shipped binary from before the gate: no `clientVersion`. */
const requestFromOldClient = (seeker: SeededUser, xolacer: SeededUser) =>
	seeker.t.mutation(api.xolacerChat.requestConversation, {
		xolacerProfileId: xolacer.profileId,
	});

describe("requestConversation's age gate", () => {
	it("lets an adult ask", async () => {
		const seeker = await asNewUser();
		const xolacer = await aXolacer(seeker);
		await declare(seeker, ADULT);

		await expect(request(seeker, xolacer)).resolves.toBeDefined();
	});

	it("refuses a declared 13-17 or under-13 user on every client", async () => {
		const teen = await asNewUser(1);
		const child = await asNewUser(3, teen.root);
		const xolacer = await aXolacer(teen);
		await declare(teen, TEEN);
		await declare(child, CHILD);

		await expect(request(teen, xolacer)).rejects.toMatchObject({
			data: { code: "age_restricted", status: "13_17" },
		});
		await expect(requestFromOldClient(child, xolacer)).rejects.toMatchObject({
			data: { code: "age_restricted", status: "under_13" },
		});
	});

	it("asks a current client with no date of birth, even a v1 user with an adult bracket", async () => {
		const seeker = await asNewUser();
		await seeker.t.mutation(api.intake.complete, {
			...V1_ANSWERS,
			ageBracket: "25_34",
		});
		const xolacer = await aXolacer(seeker);

		await expectCode(() => request(seeker, xolacer), "age_required");
	});

	it("lets an old client with no date of birth through, as before the gate", async () => {
		const seeker = await asNewUser();
		const xolacer = await aXolacer(seeker);

		await expect(requestFromOldClient(seeker, xolacer)).resolves.toBeDefined();
	});

	it("leaves a pending or open conversation where it is", async () => {
		const seeker = await asNewUser();
		const xolacer = await aXolacer(seeker);
		const conversationId = await requestFromOldClient(seeker, xolacer);

		// Updated, still no date of birth: the request they already sent stands.
		expect(await request(seeker, xolacer)).toBe(conversationId);
	});

	it("answers on age before availability, so a minor isn't told the Xolacer is busy", async () => {
		const teen = await asNewUser();
		const xolacer = await aXolacer(teen);
		await declare(teen, TEEN);
		await teen.root.run(async (ctx) => {
			const row = await ctx.db
				.query("xolacer_profiles")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", xolacer.profileId)
				)
				.unique();
			if (row) {
				await ctx.db.patch("xolacer_profiles", row._id, { active: false });
			}
		});

		await expectCode(() => request(teen, xolacer), "age_restricted");
	});

	it("asks before resuming a resting conversation", async () => {
		const seeker = await asNewUser();
		const xolacer = await aXolacer(seeker);
		const conversationId = await requestFromOldClient(seeker, xolacer);
		await seeker.root.run((ctx) =>
			ctx.db.patch("xolacer_conversations", conversationId, {
				status: "resting",
			})
		);

		await expectCode(() => request(seeker, xolacer), "age_required");
	});
});

describe("resumeConversation's age gate", () => {
	/** A resting conversation between them, from before the gate. */
	async function resting(seeker: SeededUser, xolacer: SeededUser) {
		const conversationId = await requestFromOldClient(seeker, xolacer);
		await seeker.root.run((ctx) =>
			ctx.db.patch("xolacer_conversations", conversationId, {
				status: "resting",
			})
		);
		return conversationId;
	}

	it("asks a current client with no date of birth, and refuses a declared minor", async () => {
		const unknown = await asNewUser(1);
		const teen = await asNewUser(3, unknown.root);
		const xolacer = await aXolacer(unknown);
		const unknownChat = await resting(unknown, xolacer);
		const teenChat = await resting(teen, xolacer);
		await declare(teen, TEEN);

		await expectCode(
			() =>
				unknown.t.mutation(api.xolacerChat.resumeConversation, {
					clientVersion: CLIENT_VERSION,
					conversationId: unknownChat,
				}),
			"age_required"
		);
		await expectCode(
			() =>
				teen.t.mutation(api.xolacerChat.resumeConversation, {
					conversationId: teenChat,
				}),
			"age_restricted"
		);
	});

	it("lets an old client and an adult resume", async () => {
		const seeker = await asNewUser(1);
		const adult = await asNewUser(3, seeker.root);
		const xolacer = await aXolacer(seeker);
		const oldClientChat = await resting(seeker, xolacer);
		const adultChat = await resting(adult, xolacer);
		await declare(adult, ADULT);

		expect(
			await seeker.t.mutation(api.xolacerChat.resumeConversation, {
				conversationId: oldClientChat,
			})
		).toEqual({ resumed: true });
		expect(
			await adult.t.mutation(api.xolacerChat.resumeConversation, {
				clientVersion: CLIENT_VERSION,
				conversationId: adultChat,
			})
		).toEqual({ resumed: true });
	});
});

describe("the Xolacer side of the gate", () => {
	it("refuses a declared minor publishing a Xolacer profile; unknown still publishes", async () => {
		const seeker = await asNewUser(1);
		const minor = await aXolacer(seeker, 2);
		const unknown = await aXolacer(seeker, 3);
		await declare(minor, TEEN);

		await expect(
			minor.t.mutation(api.xolacerChat.publishProfile, {})
		).rejects.toMatchObject({
			data: { code: "age_restricted", status: "13_17" },
		});
		await expect(
			unknown.t.mutation(api.xolacerChat.publishProfile, {})
		).resolves.toBeNull();
	});

	it("refuses a declared minor accepting a request", async () => {
		const seeker = await asNewUser(1);
		const xolacer = await aXolacer(seeker);
		await declare(seeker, ADULT);
		const conversationId = await request(seeker, xolacer);
		await declare(xolacer, TEEN);

		await expect(
			xolacer.t.action(api.xolacerChat.acceptRequest, { conversationId })
		).rejects.toMatchObject({
			data: { code: "age_restricted", status: "13_17" },
		});
	});

	it("lets an adult or undeclared Xolacer accept", async () => {
		const seeker = await asNewUser(1);
		const xolacer = await aXolacer(seeker);
		await declare(seeker, ADULT);
		const conversationId = await request(seeker, xolacer);

		await expect(
			xolacer.t.action(api.xolacerChat.acceptRequest, { conversationId })
		).resolves.toBeNull();
	});
});
