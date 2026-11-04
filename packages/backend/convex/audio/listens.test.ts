// @vitest-environment edge-runtime
/**
 * #697: a listen counts as showing up and earns First listen. What can go
 * wrong: the call logs nothing (or the wrong action), a listen-only day
 * doesn't extend the streak or count as a day showed up, or First listen is
 * awarded again on a later listen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(false));

const DAY = 24 * 60 * 60 * 1000;
const BASE = Date.UTC(2026, 0, 5, 12); // noon UTC; test users have no timezone → UTC

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(BASE);
});
afterEach(() => vi.useRealTimers());

const seedTrack = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db.insert("audio_tracks", {
			active: true,
			durationSec: 40,
			family: "music",
			key: "music/rain.m4a",
			sha256: "a",
			slug: "rain",
			sourceTags: [],
			tags: [],
			thumbKey: "thumb/b.webp",
			thumbSha256: "b",
			title: "Rain",
			topic: "music_topic_calm",
		})
	);
const listen = (user: SeededUser, trackId: Id<"audio_tracks">) =>
	user.t.mutation(api.audio.listens.recordListen, { trackId });
const logRows = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("activity_log")
			.withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);
const earned = async (user: SeededUser) =>
	(
		await user.root.run((ctx) =>
			ctx.db
				.query("user_achievements")
				.withIndex("by_emotionalProfileId_and_earnedAt", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		)
	)
		.map((r) => r.achievementId)
		.filter((id) => id !== "joined");
const profile = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db.get("emotional_profiles", user.profileId)
	) as Promise<Doc<"emotional_profiles">>;

describe("audio.listens.recordListen", () => {
	it("logs one listen and earns First listen", async () => {
		const user = await asNewUser();
		const trackId = await seedTrack(user);

		await listen(user, trackId);

		expect((await logRows(user)).map((r) => [r.actionType, r.count])).toEqual([
			["listen", 1],
		]);
		expect(await earned(user)).toEqual(["first-listen"]);
	});

	it("a second listen the same day bumps the count and awards nothing new", async () => {
		const user = await asNewUser();
		const trackId = await seedTrack(user);

		await listen(user, trackId);
		await listen(user, trackId);

		expect((await logRows(user)).map((r) => [r.actionType, r.count])).toEqual([
			["listen", 2],
		]);
		expect(await earned(user)).toEqual(["first-listen"]);
		expect((await profile(user)).daysShowedUp).toBe(1);
	});

	it("a day with only a listen extends the streak and counts as a day showed up", async () => {
		const user = await asNewUser();
		const trackId = await seedTrack(user);
		await user.t.mutation(internal.streaks.manual.recordActivityManual, {
			actionType: "reflect",
			emotionalProfileId: user.profileId,
			timestamp: BASE,
		});

		vi.setSystemTime(BASE + DAY);
		await listen(user, trackId);

		const p = await profile(user);
		expect(p.currentStreak).toBe(2);
		expect(p.daysShowedUp).toBe(2);
	});

	it("needs a signed-in user", async () => {
		const user = await asNewUser();
		const trackId = await seedTrack(user);

		await expect(
			user.root.mutation(api.audio.listens.recordListen, { trackId })
		).rejects.toThrow();
		expect(await logRows(user)).toEqual([]);
	});
});
