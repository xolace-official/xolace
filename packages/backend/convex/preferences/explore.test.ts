// @vitest-environment edge-runtime
/**
 * What someone turned off on Explore home (redesign B7): "Remove from here"
 * on a Continue card, and "Don't use my sessions here".
 *
 * Failure modes:
 *  1. An account that never chose reads anything but "nothing hidden,
 *     sessions used".
 *  2. A removed card comes back, is listed twice, or a track and an entry
 *     are confused.
 *  3. The list grows without bound on one row.
 *  4. Another person's Explore changes.
 *  5. Signed out, it answers instead of refusing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { expectCode } from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { MAX_HIDDEN_CONTINUE } from "./explore";

vi.mock("../lib/aggregates", () => aggregatesMock());

const NOW = Date.UTC(2026, 10, 17, 12);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => {
	vi.useRealTimers();
});

async function seedTracks(user: SeededUser, n: number) {
	return await user.root.run(async (ctx) => {
		const ids: Id<"audio_tracks">[] = [];
		for (let i = 0; i < n; i++) {
			ids.push(
				await ctx.db.insert("audio_tracks", {
					active: true,
					durationSec: 540,
					family: "support",
					key: `support/track-${i}.m4a`,
					sha256: `sha-${i}`,
					slug: `track-${i}`,
					sourceTags: [],
					tags: [],
					thumbKey: `thumb/${i}.webp`,
					thumbSha256: `thumb-${i}`,
					title: `Track ${i}`,
					topic: "audio_topic_sleep",
				})
			);
		}
		return ids;
	});
}

function seedEntry(user: SeededUser) {
	return user.root.run((ctx) =>
		ctx.db.insert("library_entries", {
			active: true,
			dek: "D",
			kind: "advice",
			lastReviewedAt: 1,
			primarySubject: "sleep",
			readMin: 6,
			reuse: "adapted",
			searchText: "night",
			slug: "loud-at-night",
			title: "Why your mind gets loud at night",
		} as Doc<"library_entries">)
	);
}

const read = (user: SeededUser) =>
	user.t.query(api.preferences.explore.get, {});

const hideTrack = (user: SeededUser, id: Id<"audio_tracks">) =>
	user.t.mutation(api.preferences.explore.hideContinueItem, {
		item: { id, kind: "track" },
	});

const storedHidden = async (user: SeededUser) =>
	(await user.t.query(api.preferences.get, {})).exploreHiddenContinue;

describe("preferences/explore", () => {
	it("hides nothing and uses sessions for an account that never chose", async () => {
		const user = await asNewUser();
		expect(await read(user)).toEqual({
			hiddenContinue: [],
			usesSessions: true,
		});
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs.exploreHiddenContinue).toBeUndefined();
		expect(prefs.exploreUsesSessions).toBeUndefined();
	});

	it("keeps removed tracks and entries apart, in the order removed, with when", async () => {
		const user = await asNewUser();
		const [track] = await seedTracks(user, 1);
		const entry = await seedEntry(user);

		await hideTrack(user, track);
		vi.setSystemTime(NOW + 1000);
		await user.t.mutation(api.preferences.explore.hideContinueItem, {
			item: { id: entry, kind: "entry" },
		});

		expect((await read(user)).hiddenContinue).toEqual([
			{ id: track, kind: "track" },
			{ id: entry, kind: "entry" },
		]);
		expect(await storedHidden(user)).toEqual([
			{ hiddenAt: NOW, item: { id: track, kind: "track" } },
			{ hiddenAt: NOW + 1000, item: { id: entry, kind: "entry" } },
		]);
	});

	it("lists a card removed twice once, newest, with the later time", async () => {
		const user = await asNewUser();
		const [a, b] = await seedTracks(user, 2);
		await hideTrack(user, a);
		await hideTrack(user, b);
		vi.setSystemTime(NOW + 5000);
		await hideTrack(user, a);

		expect(await storedHidden(user)).toEqual([
			{ hiddenAt: NOW, item: { id: b, kind: "track" } },
			{ hiddenAt: NOW + 5000, item: { id: a, kind: "track" } },
		]);
	});

	it(`keeps the newest ${MAX_HIDDEN_CONTINUE} removals`, async () => {
		const user = await asNewUser();
		const ids = await seedTracks(user, MAX_HIDDEN_CONTINUE + 1);
		for (const id of ids) {
			await hideTrack(user, id);
		}
		const kept = (await read(user)).hiddenContinue;
		expect(kept).toHaveLength(MAX_HIDDEN_CONTINUE);
		expect(kept.map((item) => item.id)).toEqual(ids.slice(1));
	});

	it("turns sessions off and back on", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.preferences.explore.setUsesSessions, {
			usesSessions: false,
		});
		expect((await read(user)).usesSessions).toBe(false);
		expect(
			(await user.t.query(api.preferences.get, {})).exploreUsesSessions
		).toBe(false);

		await user.t.mutation(api.preferences.explore.setUsesSessions, {
			usesSessions: true,
		});
		expect((await read(user)).usesSessions).toBe(true);
	});

	it("leaves the other setting alone", async () => {
		const user = await asNewUser();
		const [track] = await seedTracks(user, 1);
		await hideTrack(user, track);
		await user.t.mutation(api.preferences.explore.setUsesSessions, {
			usesSessions: false,
		});
		expect(await read(user)).toEqual({
			hiddenContinue: [{ id: track, kind: "track" }],
			usesSessions: false,
		});
	});

	it("changes only the caller's preferences", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		const [track] = await seedTracks(a, 1);
		await hideTrack(a, track);
		await a.t.mutation(api.preferences.explore.setUsesSessions, {
			usesSessions: false,
		});
		expect(await read(b)).toEqual({ hiddenContinue: [], usesSessions: true });
	});

	it("rejects a track id passed as an entry", async () => {
		const user = await asNewUser();
		const [track] = await seedTracks(user, 1);
		await expect(
			user.t.mutation(api.preferences.explore.hideContinueItem, {
				item: { id: track as unknown as Id<"library_entries">, kind: "entry" },
			})
		).rejects.toThrow();
		expect((await read(user)).hiddenContinue).toEqual([]);
	});

	it("refuses signed out", async () => {
		const user = await asNewUser();
		const [track] = await seedTracks(user, 1);
		const t = asUnauthed();
		await expectCode(
			() => t.query(api.preferences.explore.get, {}),
			"not_authenticated"
		);
		await expectCode(
			() =>
				t.mutation(api.preferences.explore.hideContinueItem, {
					item: { id: track, kind: "track" },
				}),
			"not_authenticated"
		);
		await expectCode(
			() =>
				t.mutation(api.preferences.explore.setUsesSessions, {
					usesSessions: false,
				}),
			"not_authenticated"
		);
	});
});
