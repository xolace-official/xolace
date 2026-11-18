// @vitest-environment edge-runtime
/**
 * A held day's second line on This week (redesign B17): "2 moments · Work ·
 * Overwhelmed · ended lighter", from `getWeekIntensity({ withDetail: true })`.
 *
 * Failure modes, written before the code:
 *  1. Shipped builds (no `withDetail`) get a different answer, or pay the reads.
 *  2. A day's detail counts moments that sit under a neighbouring bar: off at
 *     midnight, or bucketed differently from the bars.
 *  3. A tie for top domain or emotion goes a different way from call to call.
 *  4. A sensitive life area (trauma, abuse…) is named on the card.
 *  5. "Ended lighter" said of a day whose last moment wasn't answered.
 *  6. At the read cap, a day read in part is given a count it doesn't have.
 *  7. One user's moments show in another's week.
 *
 * Times are built in the runtime's local zone, as the code buckets them (UTC
 * on Convex), so the suite holds whatever zone it runs in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { seedMetadata, seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { dayDetail, mostFrequent, WEEK_MAX_MOMENTS } from "./weekDetail";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock());

/** Sunday 15 November 2026, 20:00 local: the last day of a Mon–Sun week. */
const NOW = new Date(2026, 10, 15, 20).getTime();
/** Index of each day in the week's `days`, Monday first. */
const MON = 0;
const TUE = 1;
const WED = 2;
const SUN = 6;

beforeEach(() => {
	vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
	vi.useRealTimers();
});

/** Local time on day `index` of this week (0 = Monday … 6 = today, Sunday). */
function on(index: number, hours = 12, minutes = 0, seconds = 0, ms = 0) {
	const d = new Date(NOW);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() - (SUN - index));
	d.setHours(hours, minutes, seconds, ms);
	return d.getTime();
}

type Moment = {
	createdAt: number;
	intensity?: number;
	mood?: Doc<"sessions">["postSessionMood"];
	primaryEmotion?: string;
	thematicTags?: string[];
};

async function seed(user: SeededUser, moments: Moment[]) {
	for (const { mood, ...m } of moments) {
		const sessionId = await seedSession(user.root, user.profileId, {
			createdAt: m.createdAt,
			postSessionMood: mood,
			state: "completed",
		});
		await seedMetadata(user.root, sessionId, user.profileId, m);
	}
}

const week = (user: SeededUser, withDetail?: boolean) =>
	user.t.query(
		api.profile.getWeekIntensity,
		withDetail === undefined ? {} : { withDetail }
	);

const details = async (user: SeededUser) =>
	(await week(user, true)).days.map((d) => d.detail);

describe("mostFrequent", () => {
	it("is null with nothing seen", () => {
		expect(mostFrequent([])).toBeNull();
	});

	it("picks the most frequent", () => {
		expect(mostFrequent(["a", "b", "b", "a", "b"])).toBe("b");
	});

	it("breaks a tie toward the one seen latest", () => {
		expect(mostFrequent(["a", "b"])).toBe("b");
		expect(mostFrequent(["b", "a"])).toBe("a");
		expect(mostFrequent(["a", "b", "b", "a"])).toBe("a");
		expect(mostFrequent(["b", "a", "a", "b"])).toBe("b");
	});
});

describe("dayDetail", () => {
	type Row = Parameters<typeof dayDetail>[0][number];
	const moment = (over: Partial<Row> = {}): Row => ({
		createdAt: 0,
		primaryEmotion: "anxiety",
		sessionId: "s" as Row["sessionId"],
		thematicTags: ["work"],
		...over,
	});

	it("counts a moment once per domain, however many of its tags share it", () => {
		// "work" + "burnout" + "studies" are all Work; one "romance" is Love.
		// Counting tags would make Work 3–2; counting moments makes it 1–2.
		const detail = dayDetail(
			[
				moment({ thematicTags: ["work", "burnout", "studies"] }),
				moment({ thematicTags: ["romance"] }),
				moment({ thematicTags: ["friendships"] }),
			],
			null
		);
		expect(detail.topDomain).toBe("love");
	});

	it("names no domain from texture or sensitive tags, or tags off the list", () => {
		const detail = dayDetail(
			[
				moment({ thematicTags: ["trauma", "abuse"] }),
				moment({ thematicTags: ["change", "conflict"] }),
				moment({ thematicTags: ["not-a-tag"] }),
				moment({ thematicTags: [] }),
			],
			"lighter"
		);
		expect(detail).toEqual({
			ended: "lighter",
			moments: 4,
			topDomain: null,
			topEmotion: "anxiety",
		});
	});

	it("skips a blank emotion", () => {
		expect(
			dayDetail([moment({ primaryEmotion: " " })], null).topEmotion
		).toBeNull();
		expect(
			dayDetail(
				[moment({ primaryEmotion: "" }), moment({ primaryEmotion: "grief" })],
				null
			).topEmotion
		).toBe("grief");
	});

	it("reads unsure and no answer alike, as not knowing how it ended", () => {
		expect(dayDetail([moment()], "unsure").ended).toBeNull();
		expect(dayDetail([moment()], undefined).ended).toBeNull();
		expect(dayDetail([moment()], null).ended).toBeNull();
		expect(dayDetail([moment()], "heavier").ended).toBe("heavier");
		expect(dayDetail([moment()], "same").ended).toBe("same");
	});
});

describe("getWeekIntensity withDetail", () => {
	it("sends no detail unless asked, as shipped builds expect", async () => {
		const user = await asNewUser();
		await seed(user, [{ createdAt: on(MON), mood: "lighter" }]);
		for (const asked of [undefined, false]) {
			const result = await week(user, asked);
			expect(result.days.every((d) => !("detail" in d))).toBe(true);
		}
		// And the rest of the answer is the same either way.
		const { days, ...rest } = await week(user, true);
		const { days: plainDays, ...plainRest } = await week(user);
		expect(rest).toEqual(plainRest);
		expect(days.map(({ detail: _, ...d }) => d)).toEqual(plainDays);
	});

	it("gives no detail to a day without moments", async () => {
		const user = await asNewUser();
		expect(await details(user)).toEqual(Array(7).fill(undefined));

		await seed(user, [{ createdAt: on(TUE) }]);
		const result = await details(user);
		expect(result.filter(Boolean)).toHaveLength(1);
		expect(result[TUE]).toBeDefined();
	});

	it("says the board's Tuesday", async () => {
		const user = await asNewUser();
		await seed(user, [
			{
				createdAt: on(TUE, 9),
				mood: "same",
				primaryEmotion: "overwhelm",
				thematicTags: ["work"],
			},
			{
				createdAt: on(TUE, 21),
				mood: "lighter",
				primaryEmotion: "overwhelm",
				thematicTags: ["studies", "change"],
			},
		]);
		expect((await details(user))[TUE]).toEqual({
			ended: "lighter",
			moments: 2,
			topDomain: "work",
			topEmotion: "overwhelm",
		});
	});

	it("breaks ties toward the day's later moments", async () => {
		const user = await asNewUser();
		await seed(user, [
			{
				createdAt: on(WED, 8),
				primaryEmotion: "grief",
				thematicTags: ["family"],
			},
			{
				createdAt: on(WED, 18),
				primaryEmotion: "anger",
				thematicTags: ["work"],
			},
		]);
		expect((await details(user))[WED]).toMatchObject({
			topDomain: "work",
			topEmotion: "anger",
		});
	});

	it("leaves out what the moments don't say", async () => {
		const user = await asNewUser();
		await seed(user, [
			{ createdAt: on(MON), primaryEmotion: "", thematicTags: ["trauma"] },
		]);
		expect((await details(user))[MON]).toEqual({
			ended: null,
			moments: 1,
			topDomain: null,
			topEmotion: null,
		});
	});

	it("says nothing of how a day ended when its last moment wasn't answered", async () => {
		const user = await asNewUser();
		await seed(user, [
			// Monday: none answered.
			{ createdAt: on(MON, 9) },
			{ createdAt: on(MON, 15), mood: "unsure" },
			// Tuesday: an earlier one ended lighter, but not the last.
			{ createdAt: on(TUE, 9), mood: "lighter" },
			{ createdAt: on(TUE, 15) },
		]);
		const result = await details(user);
		expect(result[MON]).toMatchObject({ ended: null, moments: 2 });
		expect(result[TUE]).toMatchObject({ ended: null, moments: 2 });
	});

	it("splits days at midnight exactly as the bars do", async () => {
		const user = await asNewUser();
		await seed(user, [
			{ createdAt: on(MON, 23, 59, 59, 999), intensity: 2, mood: "heavier" },
			{ createdAt: on(TUE, 0), intensity: 8, mood: "lighter" },
			{ createdAt: on(TUE, 0, 0, 0, 1), intensity: 6, mood: "same" },
		]);
		const result = await week(user, true);
		expect(result.days[MON]).toMatchObject({
			detail: { ended: "heavier", moments: 1 },
			intensity: 2,
		});
		expect(result.days[TUE]).toMatchObject({
			detail: { ended: "same", moments: 2 },
			intensity: 7,
		});
		// Every day with a bar has a detail, and only those.
		for (const day of result.days) {
			expect(day.detail === undefined).toBe(day.intensity === null);
		}
	});

	it("leaves out the week's edges", async () => {
		const user = await asNewUser();
		await seed(user, [
			{ createdAt: on(MON, 0) - 1 },
			{ createdAt: on(SUN, 23, 59, 59, 999) },
			{ createdAt: on(SUN, 23, 59, 59, 999) + 1 },
		]);
		const result = await details(user);
		expect(result[MON]).toBeUndefined();
		expect(result[SUN]).toMatchObject({ moments: 1 });
	});

	it("reads only the caller's moments", async () => {
		const user = await asNewUser(1);
		const other = await asNewUser(2, user.root);
		await seed(other, [{ createdAt: on(MON), mood: "lighter" }]);
		expect((await details(user)).filter(Boolean)).toHaveLength(0);
	});

	/** Monday's rows, then Tuesday's, then Wednesday's, all on one session. */
	async function seedRows(
		user: SeededUser,
		counts: { mon: number; tue: number; wed?: number }
	) {
		const sessionId = await seedSession(user.root, user.profileId, {
			createdAt: on(MON),
			postSessionMood: "lighter",
			state: "completed",
		});
		const rows = [
			...Array.from({ length: counts.mon }, (_, i) => on(MON, 1, 0, i)),
			...Array.from({ length: counts.tue }, (_, i) => on(TUE, 1, 0, i)),
			...Array.from({ length: counts.wed ?? 0 }, (_, i) => on(WED, 1, 0, i)),
		];
		await user.root.run(async (ctx) => {
			for (const createdAt of rows) {
				await ctx.db.insert("emotional_metadata", {
					classifierVersion: "test-v1",
					createdAt,
					emotionalProfileId: user.profileId,
					intensity: 5,
					primaryEmotion: "anxiety",
					primaryEmotionConfidence: 0.8,
					riskFlag: false,
					sessionId,
					specificity: 0.7,
					thematicTags: ["work"],
					userLanguageTags: [],
				});
			}
		});
	}

	it("gives no detail to a day the read cap cut through", async () => {
		const user = await asNewUser();
		// Monday fills all but 5 rows of the cap; Tuesday has 10, so only 5 of
		// them are read. Its bar is drawn from those (as before), but a count of
		// 5 would be wrong, so it gets no detail.
		await seedRows(user, { mon: WEEK_MAX_MOMENTS - 5, tue: 10 });
		const result = await week(user, true);
		expect(result.days[MON].detail).toMatchObject({
			moments: WEEK_MAX_MOMENTS - 5,
		});
		expect(result.days[TUE].intensity).toBe(5);
		expect(result.days[TUE].detail).toBeUndefined();
	});

	it("keeps the last day's detail at exactly the cap", async () => {
		const user = await asNewUser();
		await seedRows(user, { mon: WEEK_MAX_MOMENTS - 5, tue: 5 });
		const result = await week(user, true);
		expect(result.days[TUE].detail).toMatchObject({ moments: 5 });
	});

	it("keeps the last day's detail when one row over the cap starts a later day", async () => {
		const user = await asNewUser();
		// 301 rows: Tuesday's 5 are all read; the one left out is Wednesday's.
		await seedRows(user, { mon: WEEK_MAX_MOMENTS - 5, tue: 5, wed: 1 });
		const result = await week(user, true);
		expect(result.days[TUE].detail).toMatchObject({ moments: 5 });
		// Wednesday's row is past the cap: no bar and no detail, as before.
		expect(result.days[WED]).toMatchObject({ intensity: null });
		expect(result.days[WED].detail).toBeUndefined();
	});

	it("drops the last day's detail when one row over the cap is on that day", async () => {
		const user = await asNewUser();
		// 301 rows, Tuesday has 6: the sixth is left out, so the 5 read are short.
		await seedRows(user, { mon: WEEK_MAX_MOMENTS - 5, tue: 6 });
		const result = await week(user, true);
		expect(result.days[TUE].intensity).toBe(5);
		expect(result.days[TUE].detail).toBeUndefined();
	});
});
