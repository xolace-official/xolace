// @vitest-environment edge-runtime
/**
 * The Browse hub's New shelf and hero (#338), pinned as they behave: the
 * pool (fresh tracks by `newUntil`, topped up with the newest active ones,
 * at most 12), its daily rotation, the `hour` clock for `newUntil`, and the
 * hero's fallback. R2 URL minting is faked at the `r2` seam.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
	asNewUser,
	asUnauthed,
	asUser,
	makeIdentity,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { getFeaturedCore, getNewShelfCore } from "./hub";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../ai/paths/audioTracks", () => ({
	r2: { getUrl: async (key: string) => `https://r2.test/${key}` },
}));
afterEach(() => vi.restoreAllMocks());

type Track = Omit<Doc<"audio_tracks">, "_id" | "_creationTime">;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
/** Still fresh whatever the real clock says. */
const FAR_FUTURE = Date.UTC(2100, 0, 1);

const track = (
	slug: string,
	extra: Partial<Track> = {},
	family: Track["family"] = "support"
): Track => ({
	active: true,
	durationSec: 60,
	family,
	key: `${family}/${slug}.m4a`,
	sha256: slug,
	slug,
	sourceTags: [],
	tags: [],
	thumbKey: `thumb/${slug}.webp`,
	thumbSha256: slug,
	title: slug,
	topic: family === "music" ? "music_topic_sleep" : "audio_topic_sleep",
	...(family === "music"
		? {
				licence: {
					acquiredAt: 0,
					artist: "Artist",
					attributionRequired: true,
					attributionText: "Music by Artist",
					licenceName: "Pixabay",
					licenceUrl: "https://pixabay.com/service/license-summary/",
					source: "Pixabay",
					sourceUrl: "https://pixabay.com",
				},
			}
		: { narrators: ["Sage"] }),
	...extra,
});

/** Inserted in order, so each row's `_creationTime` is newer than the last. */
async function seed(user: SeededUser, tracks: Track[]) {
	await user.root.run(async (ctx) => {
		for (const t of tracks) {
			await ctx.db.insert("audio_tracks", t);
		}
	});
}

const shelf = async (
	user: SeededUser,
	args: { day?: number; hour?: number } = {}
) => (await user.t.query(api.browse.hub.getNewShelf, args)).map((t) => t.slug);

/** Five fresh tracks; f1's window ends last, so it leads the pool. */
const fiveFresh = () =>
	[1, 2, 3, 4, 5].map((n) =>
		track(`f${n}`, { newUntil: FAR_FUTURE - n * HOUR_MS })
	);

describe("browse.hub.getNewShelf", () => {
	it("hands out a shelf item per track", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("m1", { thumbhash: "hash-m1" }, "music"),
			track("s1"),
		]);

		const items = await user.t.query(api.browse.hub.getNewShelf, {});
		expect(items.map(({ _id, ...rest }) => rest)).toEqual([
			{
				attribution: "Sage",
				family: "support",
				slug: "s1",
				thumbUrl: "https://r2.test/thumb/s1.webp",
				title: "s1",
			},
			{
				attribution: "Music by Artist",
				family: "music",
				slug: "m1",
				thumbhash: "hash-m1",
				thumbUrl: "https://r2.test/thumb/m1.webp",
				title: "m1",
			},
		]);
	});

	it("puts fresh tracks first, newest window first, then the newest active ones", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("r1"),
			track("f-late", { newUntil: FAR_FUTURE }),
			track("f-early", { newUntil: FAR_FUTURE - DAY_MS }),
			track("retired", { active: false, newUntil: FAR_FUTURE }),
			track("expired", { newUntil: 1 }),
			track("r2"),
		]);

		expect(await shelf(user)).toEqual(["f-late", "f-early", "r2", "expired"]);
	});

	it("keeps the shelf full once every window has passed", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("a", { newUntil: 1 }),
			track("b", { newUntil: 2 }),
			track("c"),
			track("d"),
			track("e"),
		]);

		expect(await shelf(user)).toEqual(["e", "d", "c", "b"]);
	});

	it("fills the pool when the fresh tracks are also the newest", async () => {
		const user = await asNewUser();
		const older = Array.from({ length: 14 }, (_, i) => `o${i + 1}`);
		await seed(user, [
			...older.map((s) => track(s)),
			track("f1", { newUntil: FAR_FUTURE }),
			track("f2", { newUntil: FAR_FUTURE - HOUR_MS }),
		]);

		// Pool = f1, f2, then the 10 newest others, o14..o5. 20_411 % 12 = 11:
		// the pool's last, then back to its head.
		expect(await shelf(user, { day: 20_411 })).toEqual([
			"o5",
			"f1",
			"f2",
			"o14",
		]);
	});

	it("is empty for an empty catalogue, with or without a day", async () => {
		const user = await asNewUser();
		expect(await shelf(user)).toEqual([]);
		expect(await shelf(user, { day: 20_403 })).toEqual([]);
	});

	it("rotates the pool one step per day, and leaves it unrotated without a day", async () => {
		const user = await asNewUser();
		await seed(user, fiveFresh());

		// Pool [f1..f5]: the offset is `day % 5`.
		expect(await shelf(user)).toEqual(["f1", "f2", "f3", "f4"]);
		expect(await shelf(user, { day: 20_400 })).toEqual([
			"f1",
			"f2",
			"f3",
			"f4",
		]);
		expect(await shelf(user, { day: 20_402 })).toEqual([
			"f3",
			"f4",
			"f5",
			"f1",
		]);
		expect(await shelf(user, { day: 20_403 })).toEqual([
			"f4",
			"f5",
			"f1",
			"f2",
		]);
		expect(await shelf(user, { day: 20_405 })).toEqual([
			"f1",
			"f2",
			"f3",
			"f4",
		]);
	});

	it("rotates through at most 12 tracks", async () => {
		const user = await asNewUser();
		const slugs = Array.from({ length: 14 }, (_, i) => `t${i + 1}`);
		await seed(
			user,
			slugs.map((s) => track(s))
		);

		// Pool = the 12 newest, t14..t3. 20_411 % 12 = 11: the oldest in the
		// pool, then back to its head. t2 and t1 never show.
		expect(await shelf(user, { day: 20_411 })).toEqual([
			"t3",
			"t14",
			"t13",
			"t12",
		]);
	});

	it("expires `newUntil` by the hour when given one, else at the day's start", async () => {
		const user = await asNewUser();
		const day = 20_400;
		await seed(user, [
			// Ends 03:00 on `day`.
			track("ends-3am", { newUntil: day * DAY_MS + 3 * HOUR_MS }),
			track("newer"),
		]);

		// Day only: the clock is midnight, so `ends-3am` is still fresh.
		expect(await shelf(user, { day })).toEqual(["ends-3am", "newer"]);
		// At 05:00 it has expired, and drops behind the newer ingest.
		expect(await shelf(user, { day, hour: day * 24 + 5 })).toEqual([
			"newer",
			"ends-3am",
		]);
		// Before 03:00 it is still fresh.
		expect(await shelf(user, { day, hour: day * 24 + 2 })).toEqual([
			"ends-3am",
			"newer",
		]);
	});
});

describe("browse.hub.getFeatured", () => {
	it("returns the featured active track over fresher ones", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("picked", { featured: true }, "music"),
			track("fresh", { newUntil: FAR_FUTURE }),
		]);

		const hero = await user.t.query(api.browse.hub.getFeatured, {});
		expect(hero && { ...hero, _id: undefined }).toEqual({
			_id: undefined,
			attribution: "Music by Artist",
			family: "music",
			slug: "picked",
			thumbUrl: "https://r2.test/thumb/picked.webp",
			title: "picked",
		});
	});

	it("returns the newest when several are featured", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("older-pick", { featured: true }),
			track("newer-pick", { featured: true }),
			track("plain"),
		]);
		expect((await user.t.query(api.browse.hub.getFeatured, {}))?.slug).toBe(
			"newer-pick"
		);
	});

	it("falls back to the head of the New pool when no active track is featured", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("retired-pick", { active: false, featured: true }),
			track("fresh", { newUntil: FAR_FUTURE }),
			track("newest"),
		]);
		expect((await user.t.query(api.browse.hub.getFeatured, {}))?.slug).toBe(
			"fresh"
		);
	});

	it("falls back to the newest active track when nothing is fresh", async () => {
		const user = await asNewUser();
		await seed(user, [
			track("older"),
			track("newest"),
			track("off", { active: false }),
		]);
		expect((await user.t.query(api.browse.hub.getFeatured, {}))?.slug).toBe(
			"newest"
		);
	});

	it("is null for an empty catalogue", async () => {
		const user = await asNewUser();
		expect(await user.t.query(api.browse.hub.getFeatured, {})).toBeNull();
	});
});

/**
 * The hub is open to anyone signed in and says nothing about them, so it
 * reads no row of theirs: a query re-runs whenever a row it read changes, and
 * streaks, sparks and achievements patch `emotional_profiles` all day. Reading
 * it made every open shelf re-read the catalogue on each of those writes.
 */
describe("browse.hub reads no row about the caller", () => {
	/** Runs `read` as a signed-in caller, recording every table it reads. */
	const tablesRead = (user: SeededUser, read: (ctx: QueryCtx) => unknown) =>
		user.root.run(async (ctx) => {
			const tables = new Set<string>();
			const db = new Proxy(ctx.db, {
				get(target, prop, receiver) {
					if (prop === "query" || prop === "get") {
						return (table: string, ...rest: unknown[]) => {
							tables.add(table);
							return Reflect.apply(
								Reflect.get(target, prop, receiver),
								target,
								[table, ...rest]
							);
						};
					}
					const value = Reflect.get(target, prop, receiver);
					return typeof value === "function" ? value.bind(target) : value;
				},
			});
			const auth = {
				...ctx.auth,
				getUserIdentity: async () => ({
					...makeIdentity(),
					tokenIdentifier: `${makeIdentity().issuer}|${makeIdentity().subject}`,
				}),
			};
			await read({ ...ctx, auth, db } as unknown as QueryCtx);
			return [...tables].sort();
		});

	it("New shelf and hero read only the catalogue", async () => {
		const user = await asNewUser();
		await seed(user, [track("a", { newUntil: FAR_FUTURE }), track("b")]);

		expect(await tablesRead(user, (ctx) => getNewShelfCore(ctx, {}))).toEqual([
			"audio_tracks",
		]);
		expect(await tablesRead(user, getFeaturedCore)).toEqual(["audio_tracks"]);
	});

	it("needs only a sign-in, not a users row", async () => {
		const root = asUnauthed();
		await root.run(async (ctx) => {
			await ctx.db.insert("audio_tracks", track("a"));
		});

		expect(
			(await asUser(1, root).query(api.browse.hub.getNewShelf, {})).map(
				(t) => t.slug
			)
		).toEqual(["a"]);
		await expect(root.query(api.browse.hub.getFeatured, {})).rejects.toThrow(
			/Not authenticated/
		);
	});
});
