// @vitest-environment edge-runtime
/**
 * Settings' retention count (redesign B9): "N sessions would go" before
 * someone shortens how long Xolace keeps their sessions.
 *
 * Failure modes, written before the code:
 *  1. The warning lies: it counts a different table, cutoff or comparison
 *     than `jobs/dataRetention` deletes, so more or fewer sessions go than it
 *     said. The parity tests run the real job on the same data.
 *  2. It under-warns: a session that crosses the cutoff before the job's
 *     next run is deleted then but wasn't counted, so no alert showed.
 *  3. Off by one at the cutoff: a session exactly at it is kept by the job
 *     (strictly older goes), so it must not be counted.
 *  4. Someone else's sessions are counted.
 *  5. A heavy user's count reads without bound and fails the query.
 *  6. Signed out, it answers instead of refusing.
 *
 * And for `applyRetentionNow`, the alert's "Delete them":
 *  7. It deletes more or less than the count said, or skips the job's other
 *     sweeps (feedback, stretches…).
 *  8. It touches another person's data.
 *  9. It stops after one batch.
 * 10. Lengthening or `indefinite` deletes anything, or a purge keeps going
 *     after the person lengthened it again.
 * 11. `preferences.update` (what shipped builds call) starts deleting.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { expectCode, seedSession } from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, ragMock } from "../test/mocks.helpers";
import { MAX_COUNTED } from "./retention";
import { RETENTION_TIERS, type RetentionTier } from "./retentionCutoff";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../rag", () => ragMock());

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 16, 12);

/** Literal values, not the module's constants: a drift there must fail here. */
const DAYS_KEPT: Record<RetentionTier, number> = {
	"1_year": 365,
	"6_months": 180,
};
/** The retention cron's interval outside production (`CONVEX_ENV` unset). */
const DEV_RUN_HOURS = 72;
const PROD_RUN_HOURS = 24;

/** What the job's next run, `DEV_RUN_HOURS` from now, deletes: strictly older than this. */
const nextRunCutoff = (tier: RetentionTier) =>
	NOW + DEV_RUN_HOURS * HOUR - DAYS_KEPT[tier] * DAY;

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
});

const count = (
	user: SeededUser,
	retention: Doc<"preferences">["dataRetentionPreference"]
) =>
	user.t.query(api.privacy.retention.countSessionsPastRetention, {
		retention,
	});

/** One session of the user's per instant. */
async function seedAt(user: SeededUser, createdAts: number[]) {
	const ids: Id<"sessions">[] = [];
	for (const createdAt of createdAts) {
		ids.push(await seedSession(user.root, user.profileId, { createdAt }));
	}
	return ids;
}

const daysAgo = (...days: number[]) => days.map((d) => NOW - d * DAY);

async function setRetention(user: SeededUser, tier: RetentionTier) {
	await user.root.run(async (ctx) => {
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		if (!prefs) {
			throw new Error("getOrCreate left no preferences row");
		}
		await ctx.db.patch("preferences", prefs._id, {
			dataRetentionPreference: tier,
		});
	});
}

const apply = (user: SeededUser, preference: RetentionTier | "indefinite") =>
	user.t.mutation(api.privacy.retention.applyRetentionNow, { preference });

const retentionOf = (user: SeededUser) =>
	user.root.run(
		async (ctx) =>
			(
				await ctx.db
					.query("preferences")
					.withIndex("by_profile", (q) =>
						q.eq("emotionalProfileId", user.profileId)
					)
					.unique()
			)?.dataRetentionPreference
	);

/** Run the purge's scheduled continuations until none is left; how many ran. */
async function drainPurge(user: SeededUser) {
	const ran = new Set<string>();
	for (let i = 0; i < 20; i++) {
		const jobs = await user.root.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect()
		);
		const next = jobs.find(
			(j) =>
				j.state.kind === "pending" &&
				j.name.includes("continueRetentionPurge") &&
				!ran.has(j._id)
		);
		if (!next) {
			return ran.size;
		}
		ran.add(next._id);
		await user.root.mutation(
			internal.privacy.retention.continueRetentionPurge,
			next.args[0] as never
		);
	}
	throw new Error("the purge never finished");
}

const sessionIds = (user: SeededUser) =>
	user.root.run(async (ctx) =>
		(
			await ctx.db
				.query("sessions")
				.withIndex("by_profile_time", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		).map((s) => s._id)
	);

describe("countSessionsPastRetention", () => {
	it("counts what each retention value would remove", async () => {
		const user = await asNewUser();
		await seedAt(user, daysAgo(0, 30, 170, 190, 350, 380, 1000));

		expect(await count(user, "indefinite")).toEqual({
			capped: false,
			count: 0,
		});
		expect(await count(user, "1_year")).toEqual({ capped: false, count: 2 });
		expect(await count(user, "6_months")).toEqual({
			capped: false,
			count: 4,
		});
	});

	it("indefinite is zero however old the sessions are", async () => {
		const user = await asNewUser();
		await seedAt(user, daysAgo(10 * 365));
		expect(await count(user, "indefinite")).toEqual({
			capped: false,
			count: 0,
		});
	});

	it.each(RETENTION_TIERS)(
		"%s: a session exactly at the next run's cutoff stays; a millisecond older goes",
		async (tier) => {
			const user = await asNewUser();
			await seedAt(user, [nextRunCutoff(tier)]);
			expect(await count(user, tier)).toEqual({ capped: false, count: 0 });

			await seedAt(user, [nextRunCutoff(tier) - 1]);
			expect(await count(user, tier)).toEqual({ capped: false, count: 1 });
		}
	);

	it("counts a session that crosses the cutoff before the next run", async () => {
		const user = await asNewUser();
		// Two hours short of 180 days: kept today, deleted by the next run.
		await seedAt(user, [NOW - 180 * DAY + 2 * HOUR]);
		expect(await count(user, "6_months")).toEqual({
			capped: false,
			count: 1,
		});
	});

	it("looks ahead one production interval in production", async () => {
		vi.stubEnv("CONVEX_ENV", "production");
		const user = await asNewUser();
		const cutoff = NOW + PROD_RUN_HOURS * HOUR - 180 * DAY;
		await seedAt(user, [cutoff, cutoff + HOUR]);
		expect(await count(user, "6_months")).toEqual({
			capped: false,
			count: 0,
		});

		await seedAt(user, [cutoff - 1]);
		expect(await count(user, "6_months")).toEqual({
			capped: false,
			count: 1,
		});
	});

	it("counts only the caller's sessions", async () => {
		const mine = await asNewUser(1);
		const theirs = await asNewUser(2, mine.root);
		await seedAt(mine, daysAgo(400));
		await seedAt(theirs, daysAgo(400, 500, 600));

		expect(await count(mine, "1_year")).toEqual({ capped: false, count: 1 });
		expect(await count(theirs, "1_year")).toEqual({
			capped: false,
			count: 3,
		});
	});

	it(`stops reading past ${MAX_COUNTED} and says so`, async () => {
		const user = await asNewUser();
		await seedAt(
			user,
			Array.from({ length: MAX_COUNTED }, (_, i) => NOW - (400 + i) * DAY)
		);
		expect(await count(user, "6_months")).toEqual({
			capped: false,
			count: MAX_COUNTED,
		});

		await seedAt(user, daysAgo(2000));
		expect(await count(user, "6_months")).toEqual({
			capped: true,
			count: MAX_COUNTED,
		});
	});

	it("refuses when signed out", async () => {
		await expectCode(
			() =>
				asUnauthed().query(api.privacy.retention.countSessionsPastRetention, {
					retention: "6_months",
				}),
			"not_authenticated"
		);
	});
});

describe("parity with jobs/dataRetention", () => {
	it.each(RETENTION_TIERS)(
		"%s: the job deletes nothing uncounted now, and exactly the counted sessions at its next run",
		async (tier) => {
			const user = await asNewUser(1);
			const other = await asNewUser(2, user.root);
			const cutoff = nextRunCutoff(tier);
			const goes = await seedAt(user, [
				cutoff - 1,
				cutoff - DAY,
				NOW - 900 * DAY,
			]);
			const stays = await seedAt(user, [cutoff, cutoff + 1, NOW]);
			await seedAt(other, [cutoff - 1, cutoff - DAY]);
			await setRetention(user, tier);
			await setRetention(other, tier);

			const counted = await count(user, tier);
			expect(counted).toEqual({ capped: false, count: goes.length });

			// A run now deletes only counted sessions.
			await user.root.mutation(internal.jobs.dataRetention.enforce, { tier });
			const afterNow = await sessionIds(user);
			expect(stays.every((id) => afterNow.includes(id))).toBe(true);

			// The next run deletes the rest of them, and nothing else.
			vi.setSystemTime(NOW + DEV_RUN_HOURS * HOUR);
			await user.root.mutation(internal.jobs.dataRetention.enforce, { tier });
			expect((await sessionIds(user)).sort()).toEqual([...stays].sort());
		}
	);
});

describe("applyRetentionNow", () => {
	it.each(RETENTION_TIERS)(
		"%s: deletes exactly the sessions the count reported at the same instant",
		async (tier) => {
			const user = await asNewUser();
			const cutoff = nextRunCutoff(tier);
			const goes = await seedAt(user, [
				cutoff - 1,
				cutoff - DAY,
				NOW - 900 * DAY,
			]);
			const stays = await seedAt(user, [cutoff, cutoff + 1, NOW]);

			const counted = await count(user, tier);
			expect(await apply(user, tier)).toEqual({ scheduled: false });

			const left = await sessionIds(user);
			expect(counted.count).toBe(goes.length);
			expect(left.sort()).toEqual([...stays].sort());
			expect(await retentionOf(user)).toBe(tier);
		}
	);

	it("runs the job's other sweeps at the same cutoff", async () => {
		const user = await asNewUser();
		const cutoff = nextRunCutoff("6_months");
		await user.root.run(async (ctx) => {
			for (const createdAt of [cutoff - 1, cutoff]) {
				await ctx.db.insert("feedback", {
					createdAt,
					emotionalProfileId: user.profileId,
					type: "general",
				});
				await ctx.db.insert("compounding_stretches", {
					anchorBaseline: 67,
					domain: "work",
					emotionalProfileId: user.profileId,
					endedAt: createdAt,
					startedAt: createdAt - 30 * DAY,
				});
			}
		});

		await apply(user, "6_months");

		const kept = await user.root.run(async (ctx) => ({
			feedback: (
				await ctx.db
					.query("feedback")
					.withIndex("by_profile", (q) =>
						q.eq("emotionalProfileId", user.profileId)
					)
					.collect()
			).map((f) => f.createdAt),
			stretches: (
				await ctx.db
					.query("compounding_stretches")
					.withIndex("by_emotionalProfileId_and_endedAt", (q) =>
						q.eq("emotionalProfileId", user.profileId)
					)
					.collect()
			).map((s) => s.endedAt),
		}));
		expect(kept).toEqual({ feedback: [cutoff], stretches: [cutoff] });
	});

	it("purges steadiness insights and old semantic-profile versions, keeping the current one", async () => {
		const user = await asNewUser();
		const cutoff = nextRunCutoff("6_months");
		const seeded = await user.root.run(async (ctx) => {
			const version = (n: number, createdAt: number) =>
				ctx.db.insert("semantic_profiles", {
					createdAt,
					emotionalProfileId: user.profileId,
					version: n,
					writerVersion: "test-v1",
				});
			const insight = (oldestCitedAt: number) =>
				ctx.db.insert("steadiness_insights", {
					citedSessionIds: [],
					domains: ["work"],
					emotionalProfileId: user.profileId,
					kind: "thread",
					oldestCitedAt,
					runAt: oldestCitedAt,
					text: "An insight.",
					writtenAt: oldestCitedAt,
				});
			const versions = {
				// Past the cutoff but current: a profile not rewritten since.
				current: await version(2, cutoff - 1),
				old: await version(1, cutoff - DAY),
			};
			await ctx.db.patch("emotional_profiles", user.profileId, {
				currentSemanticProfileId: versions.current,
			});
			const insights = {
				atCutoff: await insight(cutoff),
				old: await insight(cutoff - 1),
			};
			return { insights, versions };
		});

		await apply(user, "6_months");

		const left = await user.root.run(async (ctx) => ({
			insights: {
				atCutoff: await ctx.db.get(
					"steadiness_insights",
					seeded.insights.atCutoff
				),
				old: await ctx.db.get("steadiness_insights", seeded.insights.old),
			},
			versions: {
				current: await ctx.db.get("semantic_profiles", seeded.versions.current),
				old: await ctx.db.get("semantic_profiles", seeded.versions.old),
			},
		}));
		expect(left.insights.old).toBeNull();
		expect(left.insights.atCutoff).not.toBeNull();
		expect(left.versions.old).toBeNull();
		expect(left.versions.current).not.toBeNull();
	});

	it("1 year then 6 months mid-purge: the 6-month cutoff wins and nothing newer goes", async () => {
		const user = await asNewUser();
		const sixMonths = nextRunCutoff("6_months");
		await seedAt(
			user,
			Array.from({ length: 120 }, (_, i) => NOW - (400 + i) * DAY)
		);
		// Between the two cutoffs: kept by 1 year, let go by 6 months.
		const between = await seedAt(user, daysAgo(200, 250, 300));
		const kept = await seedAt(user, [sixMonths, sixMonths + 1, NOW]);

		expect(await apply(user, "1_year")).toEqual({ scheduled: true });
		expect(await apply(user, "6_months")).toEqual({ scheduled: true });
		// The 1-year chain is still pending; it stops, the 6-month one finishes.
		await drainPurge(user);

		const left = await sessionIds(user);
		expect(left.sort()).toEqual([...kept].sort());
		expect(between.some((id) => left.includes(id))).toBe(false);
		expect(await retentionOf(user)).toBe("6_months");
	});

	it("touches only the caller's data", async () => {
		const mine = await asNewUser(1);
		const theirs = await asNewUser(2, mine.root);
		await seedAt(mine, daysAgo(400));
		const theirSessions = await seedAt(theirs, daysAgo(400, 500));

		await apply(mine, "6_months");

		expect(await sessionIds(mine)).toEqual([]);
		expect((await sessionIds(theirs)).sort()).toEqual(
			[...theirSessions].sort()
		);
		expect(await retentionOf(theirs)).toBe("indefinite");
	});

	it("continues past one batch until everything is gone", async () => {
		const user = await asNewUser();
		await seedAt(
			user,
			Array.from({ length: 120 }, (_, i) => NOW - (400 + i) * DAY)
		);
		const kept = await seedAt(user, daysAgo(1));

		expect(await apply(user, "6_months")).toEqual({ scheduled: true });
		expect((await sessionIds(user)).length).toBe(71);

		expect(await drainPurge(user)).toBe(2);
		expect(await sessionIds(user)).toEqual(kept);
	});

	it("stops a purge in progress when retention is lengthened again", async () => {
		const user = await asNewUser();
		await seedAt(
			user,
			Array.from({ length: 120 }, (_, i) => NOW - (400 + i) * DAY)
		);
		await apply(user, "6_months");
		await user.t.mutation(api.preferences.update, {
			dataRetentionPreference: "indefinite",
		});

		await drainPurge(user);
		expect((await sessionIds(user)).length).toBe(70);
	});

	it("lengthening, keeping the same value and indefinite delete nothing", async () => {
		const user = await asNewUser();
		await setRetention(user, "6_months");
		const all = await seedAt(user, daysAgo(10, 400, 1000));

		expect(await apply(user, "1_year")).toEqual({ scheduled: false });
		expect(await retentionOf(user)).toBe("1_year");
		expect(await apply(user, "1_year")).toEqual({ scheduled: false });
		expect(await apply(user, "indefinite")).toEqual({ scheduled: false });
		expect(await retentionOf(user)).toBe("indefinite");

		expect((await sessionIds(user)).sort()).toEqual([...all].sort());
	});

	it("preferences.update still saves without deleting (shipped builds)", async () => {
		const user = await asNewUser();
		const all = await seedAt(user, daysAgo(400, 1000));

		await user.t.mutation(api.preferences.update, {
			dataRetentionPreference: "6_months",
		});

		expect(await retentionOf(user)).toBe("6_months");
		expect((await sessionIds(user)).sort()).toEqual([...all].sort());
	});

	it("refuses when signed out", async () => {
		await expectCode(
			() =>
				asUnauthed().mutation(api.privacy.retention.applyRetentionNow, {
					preference: "6_months",
				}),
			"not_authenticated"
		);
	});
});
