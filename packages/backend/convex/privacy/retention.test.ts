// @vitest-environment edge-runtime
/**
 * Settings' retention count (redesign B9): "N sessions would go" before
 * someone shortens how long Xolace keeps their sessions.
 *
 * Failure modes, written before the code:
 *  1. The warning lies: it counts a different table, cutoff or comparison
 *     than `jobs/dataRetention` deletes, so more or fewer sessions go than it
 *     said. The parity tests run the real job on the same data.
 *  2. Off by one at the cutoff: a session exactly 180 (or 365) days old is
 *     kept by the job (strictly older goes), so it must not be counted.
 *  3. Someone else's sessions are counted.
 *  4. A heavy user's count reads without bound and fails the query.
 *  5. Signed out, it answers instead of refusing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { expectCode, seedSession } from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, ragMock } from "../test/mocks.helpers";
import {
	MAX_COUNTED,
	RETENTION_TIERS,
	type RetentionPreference,
	type RetentionTier,
	retentionCutoff,
} from "./retention";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../rag", () => ragMock());

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 16, 12);

/** Literal day counts, not the module's constants: a drift there must fail here. */
const DAYS_KEPT: Record<RetentionTier, number> = {
	"1_year": 365,
	"6_months": 180,
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const count = (user: SeededUser, retention: RetentionPreference) =>
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
		await seedAt(user, daysAgo(0, 30, 179, 181, 364, 366, 1000));

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
		"%s: a session exactly at the cutoff stays; a millisecond older goes",
		async (tier) => {
			const user = await asNewUser();
			const cutoff = NOW - DAYS_KEPT[tier] * DAY;
			await seedAt(user, [cutoff]);
			expect(await count(user, tier)).toEqual({ capped: false, count: 0 });

			await seedAt(user, [cutoff - 1]);
			expect(await count(user, tier)).toEqual({ capped: false, count: 1 });
		}
	);

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
		const old = Array.from(
			{ length: MAX_COUNTED },
			(_, i) => daysAgo(400 + i)[0]
		);
		await seedAt(user, old);
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
		"%s: the job deletes exactly the sessions the count counted",
		async (tier) => {
			const user = await asNewUser(1);
			const other = await asNewUser(2, user.root);
			const cutoff = retentionCutoff(tier, NOW);
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
			await user.root.mutation(internal.jobs.dataRetention.enforce, { tier });

			const left = await sessionIds(user);
			expect(counted).toEqual({ capped: false, count: goes.length });
			expect(left.sort()).toEqual([...stays].sort());
		}
	);
});
