// @vitest-environment edge-runtime
/**
 * #689: the award helper, proven through its first two write sites. What can
 * go wrong: an award lands twice (a second completion, a retry), sparks move
 * without a row or a row without sparks, an existing profile is awarded live
 * before its backfill has run, or a wipe takes badges away.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import {
	aggregatesMock,
	noopJob,
	posthogMock,
	ragMock,
	revenuecatMock,
} from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../jobs/profileStats", () => ({ updateAfterSession: noopJob() }));
vi.mock("../ai/reflectionAgent/trigger", () => ({
	onSessionComplete: noopJob(),
}));
vi.mock("../ai/paths/generate", () => ({ run: noopJob() }));
// Account deletion's push teardown: the component isn't registered in tests.
vi.mock("../lib/pushNotifications", async (orig) => ({
	...(await orig<typeof import("../lib/pushNotifications")>()),
	profilePushDevices: async () => [],
	pushNotifications: { removeToken: async () => null },
}));

const earned = (user: SeededUser) =>
	user.root.run(async (ctx) =>
		(
			await ctx.db
				.query("user_achievements")
				.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		).map((r) => r.achievementId)
	);
const profile = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db.get("emotional_profiles", user.profileId)
	) as Promise<Doc<"emotional_profiles">>;

describe("Joined Xolace", () => {
	it("is earned when the profile is created, crediting both spark counters", async () => {
		const user = await asNewUser();

		expect(await earned(user)).toEqual(["joined"]);
		const p = await profile(user);
		expect(p.achievementsBackfilledAt).toBeDefined();
		expect(p.sparksEarned).toBe(10);
		expect(p.sparkBalance).toBe(10);
	});
});

const completeSession = async (user: SeededUser) => {
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "confirmed",
	});
	await user.t.mutation(api.sessions.completeSession, { sessionId });
};
const chargeVent = (user: SeededUser) =>
	user.t.mutation(internal.vent.checkAndIncrementCap, { minutes: 1 });

describe("First session", () => {
	it("is earned by the first completed reflect", async () => {
		const user = await asNewUser();
		await completeSession(user);

		expect((await earned(user)).sort()).toEqual(["first-session", "joined"]);
		const p = await profile(user);
		expect(p.sparksEarned).toBe(20);
		expect(p.sparkBalance).toBe(20);
	});

	it("is earned by the first completed vent", async () => {
		const user = await asNewUser();
		await chargeVent(user);

		expect((await earned(user)).sort()).toEqual(["first-session", "joined"]);
		expect((await profile(user)).sparksEarned).toBe(20);
	});

	it("is earned once, whichever completion comes second", async () => {
		const user = await asNewUser();
		await completeSession(user);
		await chargeVent(user);
		await completeSession(user);

		expect((await earned(user)).sort()).toEqual(["first-session", "joined"]);
		const p = await profile(user);
		expect(p.sparksEarned).toBe(20);
		expect(p.sparkBalance).toBe(20);
	});

	it("is not earned by an action that isn't a session", async () => {
		const user = await asNewUser();
		await user.root.mutation(internal.streaks.manual.recordActivityManual, {
			actionType: "sit_with_this",
			emotionalProfileId: user.profileId,
		});

		expect(await earned(user)).toEqual(["joined"]);
	});
});

/** A profile from before achievements: no stamp, no rows, no sparks. */
async function asExistingUser(): Promise<SeededUser> {
	const user = await asNewUser();
	await user.root.run(async (ctx) => {
		const rows = await ctx.db
			.query("user_achievements")
			.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect();
		for (const row of rows) {
			await ctx.db.delete("user_achievements", row._id);
		}
		await ctx.db.patch("emotional_profiles", user.profileId, {
			achievementsBackfilledAt: undefined,
			sparkBalance: undefined,
			sparksEarned: undefined,
		});
	});
	return user;
}

describe("before the backfill", () => {
	it("an existing profile earns nothing live, from either path", async () => {
		const user = await asExistingUser();
		await user.t.mutation(api.users.getOrCreate, { authProvider: "google" });
		await completeSession(user);
		await chargeVent(user);

		expect(await earned(user)).toEqual([]);
		const p = await profile(user);
		expect(p.sparksEarned).toBeUndefined();
		expect(p.sparkBalance).toBeUndefined();
	});

	it("live awards start once the profile is stamped", async () => {
		const user = await asExistingUser();
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				achievementsBackfilledAt: Date.now(),
			})
		);
		await completeSession(user);

		expect(await earned(user)).toEqual(["first-session"]);
		expect((await profile(user)).sparksEarned).toBe(10);
	});
});

describe("awardAchievement", () => {
	it("inserts the row and credits both counters in one transaction, once", async () => {
		const user = await asNewUser();
		const { awardAchievement } = await import("./award");

		const result = await user.root.run(async (ctx) => {
			const first = await awardAchievement(ctx, user.profileId, "streak-3");
			const second = await awardAchievement(ctx, user.profileId, "streak-3");
			const row = await ctx.db
				.query("user_achievements")
				.withIndex("by_emotionalProfileId_and_achievementId", (q) =>
					q
						.eq("emotionalProfileId", user.profileId)
						.eq("achievementId", "streak-3")
				)
				.unique();
			const p = await ctx.db.get("emotional_profiles", user.profileId);
			return { first, p, row, second };
		});

		expect(result.first).toBe(true);
		expect(result.second).toBe(false);
		expect(result.row).toMatchObject({ source: "live", sparks: 10 });
		expect(result.p?.sparksEarned).toBe(20);
		expect(result.p?.sparkBalance).toBe(20);
	});

	it("earns nothing for a streak that isn't a rung", async () => {
		const user = await asNewUser();
		const { awardAchievement } = await import("./award");

		expect(
			await user.root.run((ctx) =>
				awardAchievement(ctx, user.profileId, "streak-4")
			)
		).toBe(false);
		expect(await earned(user)).toEqual(["joined"]);
	});
});

describe("wipe and deletion", () => {
	it("a data wipe keeps earned badges and both spark counters", async () => {
		const user = await asNewUser();
		await completeSession(user);
		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});

		expect((await earned(user)).sort()).toEqual(["first-session", "joined"]);
		const p = await profile(user);
		expect(p.sparksEarned).toBe(20);
		expect(p.sparkBalance).toBe(20);
		expect(p.achievementsBackfilledAt).toBeDefined();
	});

	it("a session after a wipe doesn't earn First session again", async () => {
		const user = await asNewUser();
		await completeSession(user);
		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});
		await completeSession(user);

		expect((await earned(user)).sort()).toEqual(["first-session", "joined"]);
		expect((await profile(user)).sparksEarned).toBe(20);
	});

	it("account deletion removes every row", async () => {
		const user = await asNewUser();
		await completeSession(user);
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "purging" })
		);
		await user.root.mutation(internal.jobs.accountDeletion.purgeUser, {
			userId: user.userId,
		});

		expect(await earned(user)).toEqual([]);
	});
});
