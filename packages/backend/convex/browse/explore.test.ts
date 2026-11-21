// @vitest-environment edge-runtime
/**
 * Explore home's personal shelves (B6). What can go wrong:
 *
 * - Continue shows a finished, retired or removed card, someone else's, or
 *   more than three; mixes up the order; or gets "minutes left", "% read" or
 *   the Plus flag wrong.
 * - For You reads anything from someone's sessions after they said "Don't
 *   use my sessions here" (a privacy promise: pinned against the tables it
 *   reads, not just its answer), names a sensitive area or a crisis session,
 *   or shows a section for a new member.
 * - For the hour ignores `bestAt`, doesn't turn with the day, or empties
 *   when too few tracks are tagged; `bestAt` is lost on a re-ingest.
 * - Five minutes or less lets in something longer, music, or a retired item,
 *   or one kind crowds out the other.
 *
 * R2 URL minting is faked at the `r2` seam.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { r2 } from "../ai/paths/audioTracks";
import { seedMetadata, seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { forYouFor } from "./explore";

vi.mock("../lib/aggregates", () => aggregatesMock());

const BASE = Date.UTC(2026, 10, 19, 12);
const MIN = 60_000;

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(BASE);
	vi.spyOn(r2, "getUrl").mockImplementation(
		async (key) => `https://r2.test/${key}`
	);
	vi.spyOn(r2, "deleteObject").mockResolvedValue(undefined);
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

type Track = Omit<Doc<"audio_tracks">, "_id" | "_creationTime">;
type Entry = Omit<Doc<"library_entries">, "_id" | "_creationTime">;

const LICENCE = {
	acquiredAt: 0,
	artist: "Artist",
	attributionRequired: true,
	attributionText: "Music by Artist",
	licenceName: "Pixabay",
	licenceUrl: "https://pixabay.com/service/license-summary/",
	source: "Pixabay",
	sourceUrl: "https://pixabay.com",
};

const track = (
	slug: string,
	extra: Partial<Track> = {},
	family: Track["family"] = "support"
): Track => ({
	active: true,
	durationSec: 600,
	family,
	key: `${family}/${slug}.mp3`,
	sha256: slug,
	slug,
	sourceTags: [],
	tags: [],
	thumbKey: `thumb/${slug}.webp`,
	thumbSha256: slug,
	title: slug,
	topic: family === "music" ? "music_topic_sleep" : "audio_topic_sleep",
	...(family === "music" ? { licence: LICENCE } : { narrators: ["Sage"] }),
	...extra,
});

const entry = (slug: string, extra: Partial<Entry> = {}): Entry => ({
	active: true,
	dek: "D",
	kind: "explainer",
	lastReviewedAt: 1,
	primarySubject: "sleep",
	readMin: 8,
	reuse: "original",
	slug,
	title: slug,
	...extra,
});

const addTrack = (user: SeededUser, t: Track) =>
	user.root.run((ctx) => ctx.db.insert("audio_tracks", t));
const addEntry = (user: SeededUser, e: Entry) =>
	user.root.run((ctx) => ctx.db.insert("library_entries", e));

/** Plays `trackId` to `positionSec` at `at`, through the player's mutation. */
async function listenTo(
	user: SeededUser,
	trackId: Id<"audio_tracks">,
	positionSec: number,
	at: number
) {
	vi.setSystemTime(at);
	await user.t.mutation(api.audio.progress.record, { positionSec, trackId });
}

/** Reads `entryId` to `position` (0–1) at `at`, through Lantern's reader write. */
async function readTo(
	user: SeededUser,
	entryId: Id<"library_entries">,
	position: number,
	at: number
) {
	vi.setSystemTime(at);
	await user.t.mutation(api.library.reads.record, {
		entryId,
		opened: true,
		position,
	});
}

/** A session that named `thematicTags` and `primaryEmotion`, at `at`. */
async function session(
	user: SeededUser,
	at: number,
	overrides: Partial<Doc<"emotional_metadata">> = {}
) {
	const sessionId = await seedSession(user.root, user.profileId, {
		createdAt: at,
	});
	await seedMetadata(user.root, sessionId, user.profileId, {
		createdAt: at,
		...overrides,
	});
}

const cont = (user: SeededUser) =>
	user.t.query(api.browse.explore.getContinue, {});
const forYou = (user: SeededUser) =>
	user.t.query(api.browse.explore.forYou, {});

describe("getContinue", () => {
	it("is empty for a new member", async () => {
		const user = await asNewUser();
		expect(await cont(user)).toEqual([]);
	});

	it("mixes tracks and Lantern reads, newest first, at most three", async () => {
		const user = await asNewUser();
		const a = await addTrack(user, track("letting-the-day-go"));
		const b = await addTrack(user, track("first-light"));
		const read = await addEntry(user, entry("loud-at-night"));
		const older = await addEntry(user, entry("older"));

		await readTo(user, older, 0.2, BASE + 1 * MIN);
		await listenTo(user, b, 30, BASE + 2 * MIN);
		await readTo(user, read, 0.4, BASE + 3 * MIN);
		await listenTo(user, a, 330, BASE + 4 * MIN);

		const cards = await cont(user);
		expect(cards.map((c) => [c.kind, c.id])).toEqual([
			["track", a],
			["entry", read],
			["track", b],
		]);
		expect(cards[0]).toMatchObject({
			minutesLeft: 5, // 600 − 330 = 270 s → 4.5 → 5
			plus: true,
			positionSec: 330,
			track: { _id: a, plus: true, title: "letting-the-day-go" },
			updatedAt: BASE + 4 * MIN,
		});
		expect(cards[1]).toMatchObject({
			entry: { _id: read, plus: false, slug: "loud-at-night" },
			percentRead: 40,
			plus: false,
		});
	});

	it("leaves out finished, barely started, retired and other people's items", async () => {
		const user = await asNewUser();
		const other = await asNewUser(2, user.root);
		const done = await addTrack(user, track("done"));
		const peek = await addTrack(user, track("peek"));
		const retired = await addTrack(user, track("retired"));
		const theirs = await addTrack(user, track("theirs"));
		const kept = await addTrack(user, track("kept"));
		const read = await addEntry(user, entry("finished-read"));
		const gone = await addEntry(user, entry("gone"));

		await listenTo(user, done, 120, BASE);
		await listenTo(user, done, 600, BASE + MIN);
		await listenTo(user, peek, 2, BASE);
		await listenTo(user, retired, 60, BASE);
		await listenTo(other, theirs, 60, BASE);
		await listenTo(user, kept, 60, BASE);
		await readTo(user, read, 0.5, BASE);
		await user.t.mutation(api.library.reads.record, {
			entryId: read,
			finished: true,
		});
		await readTo(user, gone, 0.5, BASE);
		await user.root.run(async (ctx) => {
			await ctx.db.patch("audio_tracks", retired, { active: false });
			await ctx.db.patch("library_entries", gone, { active: false });
		});

		expect((await cont(user)).map((c) => c.id)).toEqual([kept]);
	});

	it("never shows a card removed with Remove from here, even after more listening", async () => {
		const user = await asNewUser();
		const hidden = await addTrack(user, track("hidden"));
		const read = await addEntry(user, entry("hidden-read"));
		const shown = await addTrack(user, track("shown"));
		await listenTo(user, hidden, 60, BASE);
		await readTo(user, read, 0.3, BASE);
		await listenTo(user, shown, 60, BASE);

		await user.t.mutation(api.preferences.explore.hideContinueItem, {
			item: { id: hidden, kind: "track" },
		});
		await user.t.mutation(api.preferences.explore.hideContinueItem, {
			item: { id: read, kind: "entry" },
		});
		await listenTo(user, hidden, 200, BASE + 10 * MIN);
		await readTo(user, read, 0.6, BASE + 10 * MIN);

		expect((await cont(user)).map((c) => c.id)).toEqual([shown]);
	});

	it("a hidden card doesn't use up a place: the next one fills it", async () => {
		const user = await asNewUser();
		const ids: Id<"audio_tracks">[] = [];
		for (const [i, slug] of ["a", "b", "c", "d"].entries()) {
			const id = await addTrack(user, track(slug));
			await listenTo(user, id, 60, BASE + i * MIN);
			ids.push(id);
		}
		await user.t.mutation(api.preferences.explore.hideContinueItem, {
			item: { id: ids[3], kind: "track" },
		});
		expect((await cont(user)).map((c) => c.id)).toEqual([
			ids[2],
			ids[1],
			ids[0],
		]);
	});
});

describe("forYou", () => {
	it("is null for a new member", async () => {
		const user = await asNewUser();
		await addTrack(user, track("leaving-work", { tags: ["work"] }));
		expect(await forYou(user)).toBeNull();
	});

	it("names the life area a recent session named and shows up to three tracks for it", async () => {
		const user = await asNewUser();
		await addTrack(user, track("music-work", { tags: ["work"] }, "music"));
		await addTrack(user, track("leaving-work", { tags: ["work"] }));
		await addTrack(user, track("long-day", { tags: ["work", "anxiety"] }));
		await addTrack(user, track("yes-costs", { tags: ["work"] }));
		await addTrack(user, track("off", { active: false, tags: ["work"] }));
		await addTrack(user, track("sleep", { tags: ["sleep"] }));
		await session(user, BASE, {
			primaryEmotion: "anxiety",
			thematicTags: ["work"],
		});

		const result = await forYou(user);
		expect(result).toMatchObject({
			axis: "lifeArea",
			slug: "work",
			word: "work",
		});
		// Support before music; then the most shared words (anxiety too), then slug.
		expect(result?.tracks.map((t) => [t.slug, t.plus])).toEqual([
			["long-day", true],
			["leaving-work", true],
			["yes-costs", true],
		]);
	});

	it("falls back to the session's emotion, meeting tracks tagged with its parent", async () => {
		const user = await asNewUser();
		await addTrack(user, track("anxious-night", { tags: ["anxiety"] }));
		await session(user, BASE, {
			primaryEmotion: "stress",
			thematicTags: ["work"],
		});
		expect(await forYou(user)).toMatchObject({
			axis: "emotion",
			slug: "stress",
			tracks: [{ slug: "anxious-night" }],
			word: "stress",
		});
	});

	it("reads its header word as people say it", async () => {
		const user = await asNewUser();
		await addTrack(user, track("feeds", { tags: ["social-media"] }));
		await session(user, BASE, { thematicTags: ["social-media"] });
		expect((await forYou(user))?.word).toBe("social media");
	});

	it("never names a sensitive life area or anything from a session at risk", async () => {
		const user = await asNewUser();
		await addTrack(user, track("t1", { tags: ["trauma", "work", "anxiety"] }));
		await session(user, BASE, {
			primaryEmotion: "fear",
			thematicTags: ["trauma"],
		});
		await session(user, BASE + MIN, {
			primaryEmotion: "anxiety",
			riskFlag: true,
			thematicTags: ["work"],
		});
		expect(await forYou(user)).toBeNull();

		await session(user, BASE + 2 * MIN, {
			primaryEmotion: "anxiety",
			safeguardLevel: "crisis",
			thematicTags: ["work"],
		});
		expect(await forYou(user)).toBeNull();
	});

	it("only looks at the last two sessions", async () => {
		const user = await asNewUser();
		await addTrack(user, track("leaving-work", { tags: ["work"] }));
		await session(user, BASE, {
			primaryEmotion: "joy",
			thematicTags: ["work"],
		});
		await session(user, BASE + MIN, {
			primaryEmotion: "joy",
			thematicTags: ["family"],
		});
		expect(await forYou(user)).toMatchObject({ slug: "work" });

		await session(user, BASE + 2 * MIN, {
			primaryEmotion: "joy",
			thematicTags: ["family"],
		});
		expect(await forYou(user)).toBeNull();
	});

	describe("Don't use my sessions here", () => {
		/** For You for `user`, with every table it reads recorded. */
		const tablesRead = (user: SeededUser) =>
			user.root.run(async (ctx) => {
				const read = new Set<string>();
				const db = new Proxy(ctx.db, {
					get(target, prop, receiver) {
						if (prop === "query") {
							return (table: string) => {
								read.add(table);
								return target.query(table as "users");
							};
						}
						if (prop === "get") {
							return (table: string, id?: string) => {
								// The one-argument form has no table name to check.
								read.add(id === undefined ? "<untyped get>" : table);
								return target.get(table as "users", id as Id<"users">);
							};
						}
						const value = Reflect.get(target, prop, receiver);
						return typeof value === "function" ? value.bind(target) : value;
					},
				});
				const result = await forYouFor(
					{ ...ctx, db } as unknown as QueryCtx,
					user.profileId
				);
				return { read: [...read].sort(), result };
			});

		async function namedWork() {
			const user = await asNewUser();
			await addTrack(user, track("leaving-work", { tags: ["work"] }));
			await session(user, BASE, { thematicTags: ["work"] });
			return user;
		}

		it("reads the sessions when on (the recorder sees them)", async () => {
			const user = await namedWork();
			const { read, result } = await tablesRead(user);
			expect(result?.slug).toBe("work");
			expect(read).toContain("emotional_metadata");
		});

		it("when off, answers null and reads nothing but the preferences row", async () => {
			const user = await namedWork();
			await user.t.mutation(api.preferences.explore.setUsesSessions, {
				usesSessions: false,
			});

			expect(await forYou(user)).toBeNull();
			const { read, result } = await tablesRead(user);
			expect(result).toBeNull();
			expect(read).toEqual(["preferences"]);
		});

		it("turning it back on brings the section back", async () => {
			const user = await namedWork();
			await user.t.mutation(api.preferences.explore.setUsesSessions, {
				usesSessions: false,
			});
			await user.t.mutation(api.preferences.explore.setUsesSessions, {
				usesSessions: true,
			});
			expect((await forYou(user))?.slug).toBe("work");
		});
	});
});

describe("getForHour", () => {
	const forHour = (
		user: SeededUser,
		phase: "dawn" | "day" | "evening" | "late",
		day?: number
	) => user.t.query(api.browse.explore.getForHour, { day, phase });

	it("shows tracks tagged for the phase, turning one step a day", async () => {
		const user = await asNewUser();
		for (const slug of ["a", "b", "c", "d"]) {
			await addTrack(user, track(slug, { bestAt: ["late", "evening"] }));
		}
		await addTrack(user, track("morning", { bestAt: ["dawn"] }));
		await addTrack(user, track("off", { active: false, bestAt: ["late"] }));

		const slugs = async (day?: number) =>
			(await forHour(user, "late", day)).map((t) => t.slug);
		expect(await slugs()).toEqual(["a", "b", "c"]);
		expect(await slugs(1)).toEqual(["b", "c", "d"]);
		expect(await slugs(4)).toEqual(["a", "b", "c"]);
		expect((await forHour(user, "late"))[0].plus).toBe(true);
	});

	it("fills from the New shelf's pool when too few are tagged", async () => {
		const user = await asNewUser();
		await addTrack(user, track("tagged", { bestAt: ["dawn"] }));
		await addTrack(user, track("fresh", { newUntil: BASE + 30 * MIN }));
		await addTrack(user, track("old"));
		await addTrack(user, track("other-phase", { bestAt: ["late"] }));

		expect((await forHour(user, "dawn")).map((t) => t.slug)).toEqual([
			"tagged",
			"fresh",
			"other-phase", // newest ingested after the fresh one
		]);
	});

	it("still shows the shelf with nothing tagged", async () => {
		const user = await asNewUser();
		await addTrack(user, track("one"));
		expect((await forHour(user, "day")).map((t) => t.slug)).toEqual(["one"]);
	});

	it("is set by a script, cleared with an empty list, and kept through a re-ingest", async () => {
		const user = await asNewUser();
		const id = await addTrack(user, track("rain", {}, "music"));
		const read = () =>
			user.root.run(
				async (ctx) => (await ctx.db.get("audio_tracks", id))?.bestAt ?? "unset"
			);

		await user.root.mutation(internal.browse.explore.setBestAt, {
			bestAt: ["late", "late", "evening"],
			slug: "rain",
		});
		expect(await read()).toEqual(["late", "evening"]);

		// The same record again, as a manifest without `bestAt` sends it.
		const { active: _active, ...fields } = track("rain", {}, "music");
		const record = { ...fields, family: "music" as const, licence: LICENCE };
		await user.root.mutation(internal.ai.paths.audioTracks.upsertTrack, {
			track: record,
		});
		expect(await read()).toEqual(["late", "evening"]);

		await user.root.mutation(internal.ai.paths.audioTracks.upsertTrack, {
			track: { ...record, bestAt: ["dawn"] },
		});
		expect(await read()).toEqual(["dawn"]);

		await user.root.mutation(internal.browse.explore.setBestAt, {
			bestAt: [],
			slug: "rain",
		});
		expect(await read()).toBe("unset");
	});
});

describe("getShort", () => {
	const short = (user: SeededUser, day?: number) =>
		user.t.query(api.browse.explore.getShort, { day });

	it("takes support audio and reading of five minutes or less in turn", async () => {
		const user = await asNewUser();
		await addTrack(user, track("two-min", { durationSec: 120 }));
		await addTrack(user, track("five-min", { durationSec: 300 }));
		await addTrack(user, track("six-min", { durationSec: 360 }));
		await addTrack(user, track("loop", { durationSec: 60 }, "music"));
		await addTrack(user, track("off", { active: false, durationSec: 60 }));
		await addEntry(user, entry("panic", { readMin: 3 }));
		await addEntry(user, entry("long", { readMin: 6 }));
		await addEntry(user, entry("gone", { active: false, readMin: 2 }));

		const items = await short(user);
		expect(
			items.map((i) =>
				i.kind === "track"
					? [i.kind, i.track.slug, i.plus]
					: [i.kind, i.entry.slug, i.plus]
			)
		).toEqual([
			["track", "two-min", true],
			["entry", "panic", false],
			["track", "five-min", true],
		]);
	});

	it("shows at most six, filling from one kind when the other runs out", async () => {
		const user = await asNewUser();
		for (const n of [1, 2, 3, 4, 5]) {
			await addTrack(user, track(`t${n}`, { durationSec: n * 50 }));
		}
		for (const n of [1, 2, 3, 4]) {
			await addEntry(user, entry(`e${n}`, { readMin: n }));
		}
		const kinds = (await short(user)).map((i) => i.kind);
		expect(kinds).toEqual([
			"track",
			"entry",
			"track",
			"entry",
			"track",
			"entry",
		]);

		const one = await asNewUser(2);
		for (const n of [1, 2, 3, 4, 5, 6, 7]) {
			await addTrack(one, track(`t${n}`, { durationSec: n * 30 }));
		}
		expect(await short(one)).toHaveLength(6);
	});

	it("turns one step a day", async () => {
		const user = await asNewUser();
		await addTrack(user, track("a", { durationSec: 60 }));
		await addTrack(user, track("b", { durationSec: 120 }));
		const first = async (day: number) => {
			const [i] = await short(user, day);
			return i.kind === "track" ? i.track.slug : i.entry.slug;
		};
		expect(await first(0)).toBe("a");
		expect(await first(1)).toBe("b");
	});
});
