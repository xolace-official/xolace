// @vitest-environment edge-runtime
/**
 * Removing a deleted account from Clerk. Failure modes: the purge finishes and
 * nothing ever deletes the Clerk user; a failed call loses the only record of
 * who to delete; a legacy placeholder is sent instead of the real id; an account
 * that was reactivated, or made afresh, loses its Clerk user.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { allScheduledCalls } from "../test/fixtures.helpers";
import {
	asNewUser,
	asUserWithStatus,
	makeIdentity,
	type SeededUser,
	TEST_ISSUER,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
// Account deletion's push teardown: the component isn't registered in tests.
vi.mock("../lib/pushNotifications", async (orig) => ({
	...(await orig<typeof import("../lib/pushNotifications")>()),
	profilePushDevices: async () => [],
	pushNotifications: { removeToken: async () => null },
}));

const NOW = Date.UTC(2026, 10, 4, 12);
const HOUR = 60 * 60 * 1000;
const TOKEN = `${TEST_ISSUER}|${makeIdentity().subject}`;

let clerk: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	vi.stubEnv("CLERK_SECRET_KEY", "sk_test_key");
	clerk = vi.fn(async () => new Response(null, { status: 200 }));
	vi.stubGlobal("fetch", clerk);
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

const queued = (user: SeededUser) =>
	user.root.run((ctx) => ctx.db.query("clerk_user_deletions").collect());

const purge = (user: SeededUser) =>
	user.root.mutation(internal.jobs.accountDeletion.purgeUser, {
		userId: user.userId,
	});

const attempt = (user: SeededUser, deletionId: Id<"clerk_user_deletions">) =>
	user.root.action(internal.jobs.clerkUserDeletion.attempt, { deletionId });

/** A purged account, with its queue row. */
async function purged() {
	const user = await asUserWithStatus("purging");
	await purge(user);
	const [row] = await queued(user);
	if (!row) {
		throw new Error("the purge queued no Clerk deletion");
	}
	return { row, user };
}

describe("purge", () => {
	it("queues the Clerk user in the purge's own transaction", async () => {
		const { row, user } = await purged();
		expect(row.tokenIdentifier).toBe(TOKEN);
		expect(
			await user.root.run((ctx) => ctx.db.get("users", user.userId))
		).toBeNull();
		const calls = (await allScheduledCalls(user.root)).filter((c) =>
			c.name.endsWith("jobs/clerkUserDeletion:attempt")
		);
		expect(calls).toEqual([
			expect.objectContaining({ args: { deletionId: row._id } }),
		]);
	});

	it("queues nothing for an account reactivated in the grace period", async () => {
		const user = await asNewUser();
		await purge(user);
		expect(await queued(user)).toEqual([]);
	});
});

describe("attempt", () => {
	it("deletes the Clerk user with the secret key and clears the row", async () => {
		const { row, user } = await purged();
		await attempt(user, row._id);
		expect(clerk).toHaveBeenCalledWith(
			`https://api.clerk.com/v1/users/${makeIdentity().subject}`,
			{
				headers: { Authorization: "Bearer sk_test_key" },
				method: "DELETE",
			}
		);
		expect(await queued(user)).toEqual([]);
	});

	it("uses the verified subject, not a legacy placeholder", async () => {
		const user = await asUserWithStatus("purging");
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, {
				authProviderAccountId: "placeholder",
			})
		);
		await purge(user);
		const [row] = await queued(user);
		await attempt(user, row!._id);
		expect(clerk.mock.calls[0]?.[0]).toBe(
			`https://api.clerk.com/v1/users/${makeIdentity().subject}`
		);
	});

	it("treats a user Clerk no longer has as done", async () => {
		const { row, user } = await purged();
		clerk.mockResolvedValueOnce(new Response(null, { status: 404 }));
		await attempt(user, row._id);
		expect(await queued(user)).toEqual([]);
	});

	it.each([
		[
			"a 500",
			() => clerk.mockResolvedValueOnce(new Response(null, { status: 500 })),
		],
		["a network error", () => clerk.mockRejectedValueOnce(new Error("down"))],
		["a missing key", () => vi.stubEnv("CLERK_SECRET_KEY", "")],
	])("keeps the row after %s", async (_, fail) => {
		const { row, user } = await purged();
		fail();
		await attempt(user, row._id);
		expect(await queued(user)).toHaveLength(1);
	});

	it("leaves a Clerk user alone once they have an account again", async () => {
		const { row, user } = await purged();
		await user.root.run(async (ctx) => {
			const emotionalProfileId = await ctx.db.insert("emotional_profiles", {
				createdAt: NOW,
				currentStreak: 0,
				dominantEmotionTags: [],
				onboardingComplete: false,
				sessionCount: 0,
				updatedAt: NOW,
			});
			await ctx.db.insert("users", {
				accountStatus: "active",
				authProvider: "google",
				authProviderAccountId: makeIdentity().subject,
				createdAt: NOW,
				emotionalProfileId,
				tokenIdentifier: TOKEN,
				updatedAt: NOW,
			});
		});
		await attempt(user, row._id);
		expect(clerk).not.toHaveBeenCalled();
		expect(await queued(user)).toEqual([]);
	});

	it("never sends a subject that isn't a Clerk user id", async () => {
		const { row, user } = await purged();
		await user.root.run((ctx) =>
			ctx.db.patch("clerk_user_deletions", row._id, {
				tokenIdentifier: `${TEST_ISSUER}|seed_1`,
			})
		);
		await attempt(user, row._id);
		expect(clerk).not.toHaveBeenCalled();
		expect(await queued(user)).toEqual([]);
	});
});

describe("sweep", () => {
	const retries = async (user: SeededUser) =>
		(await allScheduledCalls(user.root)).filter((c) =>
			c.name.endsWith("jobs/clerkUserDeletion:attempt")
		);

	it("leaves a just-queued row to its first attempt", async () => {
		const { user } = await purged();
		await user.root.mutation(internal.jobs.clerkUserDeletion.sweep, {});
		expect(await retries(user)).toHaveLength(1);
	});

	it("retries a row Clerk hasn't confirmed, and backs off until it's due", async () => {
		const { row, user } = await purged();
		vi.setSystemTime(NOW + HOUR);
		await user.root.mutation(internal.jobs.clerkUserDeletion.sweep, {});
		expect(await retries(user)).toHaveLength(2);
		const [after] = await queued(user);
		expect(after?._id).toBe(row._id);
		expect(after?.lastAttemptAt).toBe(NOW + HOUR);

		await user.root.mutation(internal.jobs.clerkUserDeletion.sweep, {});
		expect(await retries(user)).toHaveLength(2);
	});
});
