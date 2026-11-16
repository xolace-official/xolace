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
import { MAX_COUNTED, RETENTION_TIERS, type RetentionTier } from "./retention";

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
