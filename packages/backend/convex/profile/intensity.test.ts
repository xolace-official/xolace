// @vitest-environment edge-runtime
/**
 * "Your usual" (redesign B8): the middle half and the median of the last
 * four weeks' day averages, or null when there are too few days to say.
 *
 * Failure modes, written before the code:
 *  1. A band from a handful of days, drawn as if it meant something.
 *  2. Moments counted instead of days: a busy day weighs more than a quiet one,
 *     or many moments on a few days pass the "enough data" bar.
 *  3. Days older than four weeks leak in, or the first day of the window drops out.
 *  4. A moment sits in a different day here than under its bar on the card
 *     (`getWeekIntensity`), so "above your usual" contradicts the chart.
 *  5. One user's moments shape another's band; a signed-out call gets one.
 *  6. At the read cap, the oldest day is averaged from only the rows that fit.
 *
 * Times are built in the runtime's local zone (`new Date(y, m, d, …)`), as
 * the code buckets them, so the suite holds whatever zone it runs in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import {
	classificationArgs,
	expectCode,
	seedMetadata,
	seedSession,
} from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import {
	MIN_USUAL_DAYS,
	quantile,
	USUAL_MAX_MOMENTS,
	USUAL_WINDOW_DAYS,
	usualBand,
	usualWindowStart,
	wholeDays,
} from "./intensity";

vi.mock("../lib/aggregates", () => aggregatesMock());
// getWeekIntensity, compared against below, reads the Plus entitlement.
vi.mock("../revenuecat", () => revenuecatMock());

/** Sunday 15 November 2026, 20:00 local: the last day of a Mon–Sun week. */
const NOW = new Date(2026, 10, 15, 20).getTime();

beforeEach(() => {
	vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
	vi.useRealTimers();
});

/** Local time on the day `offset` days from today (0 = today, -1 = yesterday). */
function at(offset: number, hours = 12, minutes = 0, seconds = 0, ms = 0) {
	const d = new Date(NOW);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + offset);
	d.setHours(hours, minutes, seconds, ms);
	return d.getTime();
}

type Moment = { createdAt: number; intensity: number };

/** One moment a day at noon, `values[0]` today, `values[1]` yesterday, … */
const daily = (values: number[]): Moment[] =>
	values.map((intensity, i) => ({ createdAt: at(-i), intensity }));

async function seed(user: SeededUser, moments: Moment[]) {
	for (const m of moments) {
		const sessionId = await seedSession(user.root, user.profileId, {
			createdAt: m.createdAt,
			state: "completed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, m);
	}
}

const band = (user: SeededUser) =>
	user.t.query(api.profile.intensity.getUsualBand, {});

describe("quantile", () => {
	it("interpolates between ranks", () => {
		const sorted = [1, 2, 3, 4, 5, 6, 7];
		expect(quantile(sorted, 0.25)).toBe(2.5);
		expect(quantile(sorted, 0.5)).toBe(4);
		expect(quantile(sorted, 0.75)).toBe(5.5);
	});

	it("returns the only value of a one-item list", () => {
		expect(quantile([6], 0.25)).toBe(6);
		expect(quantile([6], 0.75)).toBe(6);
	});

	it("refuses an empty list", () => {
		expect(() => quantile([], 0.5)).toThrow();
	});
});

describe("usualBand", () => {
	it("is null with no moments", () => {
		expect(usualBand([])).toBeNull();
	});

	it("is null one day short of the minimum, and a band at it", () => {
		const values = [1, 2, 3, 4, 5, 6, 7];
		expect(MIN_USUAL_DAYS).toBe(values.length);
		expect(usualBand(daily(values.slice(1)))).toBeNull();
		expect(usualBand(daily(values))).toEqual({
			days: 7,
			high: 5.5,
			low: 2.5,
			median: 4,
		});
	});

	it("averages a day's moments into one value, whatever their order", () => {
		// Today: 2 and 10 → 6. A busy day weighs as one day, not two.
		const moments = [
			...daily([0, 1, 2, 3, 4, 5, 7]).slice(1),
			{ createdAt: at(0, 9), intensity: 2 },
			{ createdAt: at(0, 21), intensity: 10 },
		].reverse();
		expect(usualBand(moments)).toEqual({
			days: 7,
			high: 5.5,
			low: 2.5,
			median: 4,
		});
	});

	it("needs days, not moments: many moments on few days is no band", () => {
		const moments = Array.from({ length: 30 }, (_, i) => ({
			createdAt: at(-(i % (MIN_USUAL_DAYS - 1)), 1 + (i % 20)),
			intensity: 1 + (i % 10),
		}));
		expect(usualBand(moments)).toBeNull();
	});

	it("draws a zero-width band when every day is the same", () => {
		expect(usualBand(daily(Array(10).fill(4)))).toEqual({
			days: 10,
			high: 4,
			low: 4,
			median: 4,
		});
	});
});

describe("wholeDays", () => {
	const newestFirst = [
		{ createdAt: at(0, 9) },
		{ createdAt: at(-1, 20) },
		{ createdAt: at(-2, 23) },
		{ createdAt: at(-2, 0) },
	];

	it("keeps everything under the cap: the window was read in full", () => {
		expect(wholeDays(newestFirst, newestFirst.length + 1)).toEqual(newestFirst);
	});

	it("drops the whole oldest day at the cap: it may be partly read", () => {
		expect(wholeDays(newestFirst, newestFirst.length)).toEqual(
			newestFirst.slice(0, 2)
		);
	});

	it("drops everything when the cap is all one day", () => {
		const oneDay = [{ createdAt: at(0, 10) }, { createdAt: at(0, 8) }];
		expect(wholeDays(oneDay, oneDay.length)).toEqual([]);
	});

	it("keeps an empty read empty", () => {
		expect(wholeDays([], 0)).toEqual([]);
	});
});

describe("usualWindowStart", () => {
	it("is local midnight, 27 calendar days before today", () => {
		const start = usualWindowStart(NOW);
		expect(start).toBe(at(-(USUAL_WINDOW_DAYS - 1), 0));
		expect(new Date(start).getHours()).toBe(0);
	});
});

describe("profile.intensity.getUsualBand", () => {
	it("refuses a signed-out caller", async () => {
		await expectCode(
			() => asUnauthed().query(api.profile.intensity.getUsualBand, {}),
			"not_authenticated"
		);
	});

	it("is null for a new user with no moments", async () => {
		const user = await asNewUser();
		expect(await band(user)).toBeNull();
	});

	it("is null for one week with a quiet day (six days)", async () => {
		const user = await asNewUser();
		await seed(user, daily([3, 4, 5, 6, 7, 8]));
		expect(await band(user)).toBeNull();
	});

	it("draws a band from a full week", async () => {
		const user = await asNewUser();
		await seed(user, daily([7, 6, 5, 4, 3, 2, 1]));
		expect(await band(user)).toEqual({
			days: 7,
			high: 5.5,
			low: 2.5,
			median: 4,
		});
	});

	it("is null for sparse history: six days spread over four weeks", async () => {
		const user = await asNewUser();
		await seed(
			user,
			[0, -5, -10, -15, -20, -27].map((offset) => ({
				createdAt: at(offset),
				intensity: 5,
			}))
		);
		expect(await band(user)).toBeNull();
	});

	it("uses all four weeks: every day from today back 27 days counts", async () => {
		const user = await asNewUser();
		// Days 0 … 27 back, intensity 1 … 10 repeating.
		const inside = Array.from({ length: USUAL_WINDOW_DAYS }, (_, i) => ({
			createdAt: at(-i),
			intensity: 1 + (i % 10),
		}));
		await seed(user, inside);

		const expected = usualBand(inside);
		expect(expected?.days).toBe(USUAL_WINDOW_DAYS);
		expect(await band(user)).toEqual(expected);
	});

	it("starts at the first millisecond of the window's first day", async () => {
		// Six recent days, one short of a band; the seventh decides it.
		const firstDay = -(USUAL_WINDOW_DAYS - 1);
		const six = daily([3, 4, 5, 6, 7, 8]);

		const inside = await asNewUser(1);
		await seed(inside, [...six, { createdAt: at(firstDay, 0), intensity: 1 }]);
		expect(await band(inside)).toMatchObject({ days: MIN_USUAL_DAYS });

		const outside = await asNewUser(2, inside.root);
		await seed(outside, [
			...six,
			{ createdAt: at(firstDay - 1, 23, 59, 59, 999), intensity: 1 },
		]);
		expect(await band(outside)).toBeNull();
	});

	it("ignores older history, however heavy", async () => {
		const user = await asNewUser();
		const recent = daily([4, 5, 4, 5, 4, 5, 4, 5]);
		const old = Array.from({ length: 40 }, (_, i) => ({
			createdAt: at(-USUAL_WINDOW_DAYS - i),
			intensity: 10,
		}));
		await seed(user, [...recent, ...old]);
		expect(await band(user)).toEqual(usualBand(recent));
	});

	it("reads only the caller's moments", async () => {
		const user = await asNewUser(1);
		const other = await asNewUser(2, user.root);
		await seed(other, daily([9, 9, 9, 9, 9, 9, 9, 9]));
		expect(await band(user)).toBeNull();
		await seed(user, daily([2, 2, 2, 2, 2, 2, 2]));
		expect(await band(user)).toMatchObject({ days: 7, median: 2 });
	});

	it("buckets days exactly as getWeekIntensity does, at midnight", async () => {
		const user = await asNewUser();
		// This week, Monday (6 days back) to today (Sunday). Each day has a
		// moment at its first and its last millisecond, so a bucket off by any
		// amount would move one into a neighbouring day and change its average.
		const moments = [0, 1, 2, 3, 4, 5, 6].flatMap((i) => [
			{ createdAt: at(-i, 0), intensity: 1 + i },
			{ createdAt: at(-i, 23, 59, 59, 999), intensity: 3 + i },
		]);
		await seed(user, moments);

		const week = await user.t.query(api.profile.getWeekIntensity, {});
		const bars = week.days.map((d) => d.intensity);
		expect(bars.every((b) => b !== null)).toBe(true);

		const sorted = (bars as number[]).sort((a, b) => a - b);
		expect(await band(user)).toEqual({
			days: 7,
			high: quantile(sorted, 0.75),
			low: quantile(sorted, 0.25),
			median: quantile(sorted, 0.5),
		});
		// And the bars are the per-day averages: 2 + i for the day i back.
		expect(sorted).toEqual([2, 3, 4, 5, 6, 7, 8]);
	});
	it("leaves out the oldest day when the read cap cuts through it", async () => {
		const user = await asNewUser();
		// Eight days of steady 5s, then a ninth (oldest) day whose last 8 rows
		// are 10s and earlier rows 1s. Newest first, the cap is reached 8 rows
		// into that day: averaged as read it would be a 10 its rows don't give.
		const perDay = (USUAL_MAX_MOMENTS - 8) / 8;
		const steady = Array.from({ length: 8 }, (_, day) =>
			Array.from({ length: perDay }, (_, i) => ({
				createdAt: at(-day, 1, 0, i),
				intensity: 5,
			}))
		).flat();
		const oldestDay = Array.from({ length: 20 }, (_, i) => ({
			createdAt: at(-8, 1, 0, i),
			intensity: i >= 12 ? 10 : 1,
		}));
		const all = [...steady, ...oldestDay];
		expect(all.length).toBeGreaterThan(USUAL_MAX_MOMENTS);
		await user.root.run(async (ctx) => {
			const sessionId = await ctx.db.insert("sessions", {
				createdAt: NOW,
				emotionalProfileId: user.profileId,
				entryType: "open_prompt",
				kept: true,
				state: "completed",
				updatedAt: NOW,
			});
			for (const m of all) {
				await ctx.db.insert("emotional_metadata", {
					...classificationArgs({
						emotionalProfileId: user.profileId,
						sessionId,
					}),
					...m,
				});
			}
		});

		expect(await band(user)).toEqual({ days: 8, high: 5, low: 5, median: 5 });
	});
});
