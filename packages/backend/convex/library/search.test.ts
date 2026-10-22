// @vitest-environment edge-runtime
/**
 * Browse search, Lantern section (#549): active entries only, matched on the
 * ingest-written search text; an empty query searches nothing.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";
import { trackSearchTextOf } from "./searchText";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock());
vi.mock("../ai/paths/audioTracks", () => ({
	r2: { getUrl: async (key: string) => `https://r2.test/${key}` },
}));
afterEach(() => vi.restoreAllMocks());

type Entry = Omit<Doc<"library_entries">, "_id" | "_creationTime">;

const entry = (slug: string, searchText: string, active = true): Entry => ({
	active,
	dek: `Dek ${slug}`,
	kind: "advice",
	lastReviewedAt: 1,
	primarySubject: "anxiety",
	readMin: 4,
	reuse: "adapted",
	searchText,
	slug,
	title: `Title ${slug}`,
});

describe("library.search.searchEntries", () => {
	it("returns matching active entries as cards and never a retired one", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert(
				"library_entries",
				entry("live", "exam nerves self doubt")
			);
			await ctx.db.insert(
				"library_entries",
				entry("retired", "exam panic self doubt", false)
			);
			await ctx.db.insert(
				"library_entries",
				entry("other", "grief after a loss")
			);
		});

		const hits = await user.t.query(api.library.search.searchEntries, {
			query: "Self-Doubt",
		});
		expect(hits.map((h) => h.slug)).toEqual(["live"]);
		expect(hits[0]).toMatchObject({ saved: false, views: 0 });
	});

	it("searches nothing for an empty or blank query", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert("library_entries", entry("live", "exam nerves"));
		});
		expect(
			await user.t.query(api.library.search.searchEntries, { query: "  " })
		).toEqual([]);
	});
});

type Track = Omit<Doc<"audio_tracks">, "_id" | "_creationTime">;

const track = (
	slug: string,
	family: Track["family"],
	extra: Partial<Track> = {}
): Track => {
	const t: Track = {
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
		title: `Track ${slug}`,
		topic: `${family === "music" ? "music" : "audio"}_topic_sadness`,
		...extra,
	};
	return { ...t, searchText: trackSearchTextOf(t) };
};

describe("trackSearchTextOf", () => {
	it("covers title, topic, tags, narrators and series; raw source tags for Music only", () => {
		const support = track("s", "support", {
			narrators: ["Sage", "Ash"],
			seriesTitle: "Steady Ground",
			sourceTags: ["piano"],
			tags: ["self_worth"],
			title: "The Spectrum",
		});
		expect(support.searchText).toBe(
			"the spectrum sadness self worth sage ash steady ground"
		);
		expect(
			track("m", "music", { sourceTags: ["Piano", "rain"], title: "Low Tide" })
				.searchText
		).toBe("low tide sadness piano rain");
	});
});

describe("library.search.searchCatalogue", () => {
	it("matches Music on raw source tags, never Support; never an inactive track", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert(
				"audio_tracks",
				track("m-piano", "music", { sourceTags: ["piano"] })
			);
			await ctx.db.insert(
				"audio_tracks",
				track("m-retired", "music", { active: false, sourceTags: ["piano"] })
			);
			await ctx.db.insert(
				"audio_tracks",
				track("s-tagged", "support", { sourceTags: ["piano"] })
			);
		});
		const r = await user.t.query(api.library.search.searchCatalogue, {
			query: "Piano",
		});
		expect(r.music.map((t) => t.slug)).toEqual(["m-piano"]);
		expect(r.support).toEqual([]);
	});

	it("matches Support by narrator and by series title", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert(
				"audio_tracks",
				track("ep1", "support", {
					narrators: ["Sage"],
					seriesTitle: "Steady Ground",
				})
			);
			await ctx.db.insert(
				"audio_tracks",
				track("other", "support", { narrators: ["Ash"] })
			);
		});
		const byNarrator = await user.t.query(api.library.search.searchCatalogue, {
			query: "sage",
		});
		expect(byNarrator.support.map((t) => t.slug)).toEqual(["ep1"]);
		const bySeries = await user.t.query(api.library.search.searchCatalogue, {
			query: "steady ground",
		});
		expect(bySeries.support.map((t) => t.slug)).toEqual(["ep1"]);
	});

	it("lists active hubs and topics with an active track, matched by title", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			const hub = { intro: "", items: [] };
			await ctx.db.insert("library_hubs", {
				...hub,
				active: true,
				slug: "sad-days",
				title: "For sad days",
			});
			await ctx.db.insert("library_hubs", {
				...hub,
				active: false,
				slug: "old",
				title: "Sad archive",
			});
			await ctx.db.insert("audio_tracks", track("live", "support"));
			await ctx.db.insert(
				"audio_tracks",
				track("gone", "music", { active: false, topic: "music_topic_grief" })
			);
			await ctx.db.insert("topics", {
				slug: "grief",
				thumbKey: "thumb/g.webp",
				thumbSha256: "g",
				title: "Sad grief",
			});
		});
		const r = await user.t.query(api.library.search.searchCatalogue, {
			query: "sad",
		});
		// "Sadness" starts with the query, so it outranks the hub; word order is free.
		expect(r.places.map((p) => [p.kind, p.slug])).toEqual([
			["topic", "sadness"],
			["hub", "sad-days"],
		]);
		const reordered = await user.t.query(api.library.search.searchCatalogue, {
			query: "days sad",
		});
		expect(reordered.places.map((p) => p.slug)).toEqual(["sad-days"]);
		// Prefix of a title word, not a substring: "a" is inside every title but starts none.
		const letter = await user.t.query(api.library.search.searchCatalogue, {
			query: "a",
		});
		expect(letter.places).toEqual([]);
		// Trailing punctuation is dropped rather than failing every title.
		const punct = await user.t.query(api.library.search.searchCatalogue, {
			query: "sad?",
		});
		expect(punct.places.map((p) => p.slug)).toEqual(["sadness", "sad-days"]);
		// See all reads the same places on their own, without the track searches.
		expect(
			await user.t.query(api.library.search.searchPlaces, { query: "sad" })
		).toEqual(r.places);
		expect(
			await user.t.query(api.library.search.searchPlaces, { query: " " })
		).toEqual([]);
	});

	it("searches nothing for a blank query", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert("audio_tracks", track("m", "music"));
		});
		expect(
			await user.t.query(api.library.search.searchCatalogue, { query: " " })
		).toEqual({
			music: [],
			needSomeone: false,
			places: [],
			support: [],
		});
	});

	it("flags a crisis-term query for the Need someone now? row and still returns its results", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert(
				"audio_tracks",
				track("m", "music", { sourceTags: ["hurt", "myself"] })
			);
		});
		const r = await user.t.query(api.library.search.searchCatalogue, {
			query: "Hurt  MYSELF",
		});
		expect(r.needSomeone).toBe(true);
		expect(r.music.map((t) => t.slug)).toEqual(["m"]);
		expect(
			(
				await user.t.query(api.library.search.searchCatalogue, {
					query: "self-harm",
				})
			).needSomeone
		).toBe(true);
		expect(
			(
				await user.t.query(api.library.search.searchCatalogue, {
					query: "suicidal",
				})
			).needSomeone
		).toBe(true);
		for (const query of ["suicide?", "i want to die.", "kms"]) {
			expect(
				(await user.t.query(api.library.search.searchCatalogue, { query }))
					.needSomeone
			).toBe(true);
		}
	});

	it("does not flag a query that only contains a crisis term inside another word", async () => {
		const user = await asNewUser();
		for (const query of ["piano", "die hard", "skill myself"]) {
			expect(
				(await user.t.query(api.library.search.searchCatalogue, { query }))
					.needSomeone
			).toBe(false);
		}
	});
});

describe("library.search See all pages (#551)", () => {
	const first = (numItems: number) => ({ cursor: null, numItems });

	it("pages matching active entries, never a retired one", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			for (const n of [1, 2, 3]) {
				await ctx.db.insert("library_entries", entry(`e${n}`, "exam nerves"));
			}
			await ctx.db.insert(
				"library_entries",
				entry("retired", "exam nerves", false)
			);
		});
		const p1 = await user.t.query(api.library.search.searchEntriesPage, {
			paginationOpts: first(2),
			query: "exam",
		});
		expect(p1.page).toHaveLength(2);
		expect(p1.page[0]).toMatchObject({ saved: false, views: 0 });
		expect(p1.isDone).toBe(false);
		const p2 = await user.t.query(api.library.search.searchEntriesPage, {
			paginationOpts: { cursor: p1.continueCursor, numItems: 2 },
			query: "exam",
		});
		expect([...p1.page, ...p2.page].map((e) => e.slug).sort()).toEqual([
			"e1",
			"e2",
			"e3",
		]);
	});

	it("pages one family's matching active tracks", async () => {
		const user = await asNewUser();
		await user.root.run(async (ctx) => {
			await ctx.db.insert(
				"audio_tracks",
				track("m1", "music", { sourceTags: ["piano"] })
			);
			await ctx.db.insert(
				"audio_tracks",
				track("m2", "music", { active: false, sourceTags: ["piano"] })
			);
			await ctx.db.insert(
				"audio_tracks",
				track("s1", "support", { narrators: ["piano"] })
			);
		});
		const r = await user.t.query(api.library.search.searchTracksPage, {
			family: "music",
			paginationOpts: first(10),
			query: "piano",
		});
		expect(r.page.map((t) => t.slug)).toEqual(["m1"]);
	});

	it("searches nothing for a blank query", async () => {
		const user = await asNewUser();
		const r = await user.t.query(api.library.search.searchTracksPage, {
			family: "support",
			paginationOpts: first(10),
			query: " ",
		});
		expect(r).toMatchObject({ isDone: true, page: [] });
	});
});
