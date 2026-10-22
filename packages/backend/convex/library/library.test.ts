// @vitest-environment edge-runtime
/**
 * Library base reads (#405): single entry with body/source/facets joined,
 * bounded faceted lists, and hubs resolved in editorial order. R2 URL minting
 * (hub audio items) is faked at the `r2` seam, as in test/browse.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock());
vi.mock("../ai/paths/audioTracks", () => ({
	r2: { getUrl: async (key: string) => `https://r2.test/${key}` },
}));
afterEach(() => vi.restoreAllMocks());

type Entry = Omit<Doc<"library_entries">, "_id" | "_creationTime">;

const entry = (slug: string, extra: Partial<Entry> = {}): Entry => ({
	active: true,
	dek: `Dek ${slug}`,
	kind: "advice",
	lastReviewedAt: 1,
	primarySubject: "anxiety",
	readMin: 4,
	reuse: "adapted",
	slug,
	title: `Title ${slug}`,
	...extra,
});

/** Seeds one source plus the given entries, each with a body and facets. */
async function seed(
	user: SeededUser,
	rows: { e: Entry; facets?: [string, string][] }[]
) {
	return await user.root.run(async (ctx) => {
		const sourceId = await ctx.db.insert("library_sources", {
			attributionText:
				"Contains public sector information licensed under the OGL v3.0",
			dropBrandingIfAdapted: true,
			licence: "OGL v3.0",
			name: "NHS",
			permission: "not_required",
			slug: "nhs",
		});
		const ids: Record<string, Id<"library_entries">> = {};
		for (const { e, facets = [] } of rows) {
			const entryId = await ctx.db.insert("library_entries", e);
			ids[e.slug] = entryId;
			await ctx.db.insert("library_entry_sources", {
				entryId,
				order: 0,
				pageTitle: "Stress",
				sourceId,
			});
			await ctx.db.insert("library_entry_bodies", {
				entryId,
				markdown: `# ${e.slug}`,
			});
			for (const [axis, slug] of facets) {
				await ctx.db.insert("library_entry_facets", { axis, entryId, slug });
			}
		}
		return ids;
	});
}

describe("library.getEntry", () => {
	it("joins body, source and facets, and hides curator-only fields", async () => {
		const user = await asNewUser();
		await seed(user, [
			{
				e: entry("worry", {
					kind: "explainer",
					lastReviewedAt: 9,
					safetyReviewedAt: 5,
				}),
				facets: [
					["subject", "anxiety"],
					["audience", "student"],
				],
			},
		]);

		const got = await user.t.query(api.library.entries.getEntry, {
			slug: "worry",
		});
		expect(got).toMatchObject({
			facets: expect.arrayContaining([
				{ axis: "subject", slug: "anxiety" },
				{ axis: "audience", slug: "student" },
			]),
			kind: "explainer",
			markdown: "# worry",
			slug: "worry",
			sources: [
				{
					attributionText: expect.stringContaining("OGL"),
					name: "NHS",
					pageTitle: "Stress",
				},
			],
		});
		expect(got).not.toHaveProperty("lastReviewedAt");
		expect(got).not.toHaveProperty("safetyReviewedAt");
		expect(got).not.toHaveProperty("consentRecordedAt");
	});

	it("returns null for an unknown slug", async () => {
		const user = await asNewUser();
		expect(
			await user.t.query(api.library.entries.getEntry, { slug: "nope" })
		).toBeNull();
	});

	it("serves a retracted entry only to a reader who opened it (#404 read-only access)", async () => {
		const user = await asNewUser();
		const { gone } = await seed(user, [
			{ e: entry("gone", { active: false }) },
		]);
		expect(
			await user.t.query(api.library.entries.getEntry, { slug: "gone" })
		).toBeNull();

		await user.root.run((ctx) =>
			ctx.db.insert("library_reads", {
				emotionalProfileId: user.profileId,
				entryId: gone,
				helped: false,
				saved: false,
				viewedAt: 1,
			})
		);
		const got = await user.t.query(api.library.entries.getEntry, {
			slug: "gone",
		});
		expect(got?.active).toBe(false);
	});

	it("requires sign-in", async () => {
		await expect(
			asUnauthed().query(api.library.entries.getEntry, { slug: "x" })
		).rejects.toThrow();
	});
});

describe("library.listEntries", () => {
	it("lists active entries only, filtered by kind", async () => {
		const user = await asNewUser();
		await seed(user, [
			{ e: entry("a", { kind: "story" }) },
			{ e: entry("b", { kind: "advice" }) },
			{ e: entry("c", { active: false, kind: "story" }) },
		]);
		const all = await user.t.query(api.library.entries.listEntries, {});
		expect(all.map((e) => e.slug).sort()).toEqual(["a", "b"]);
		const stories = await user.t.query(api.library.entries.listEntries, {
			kind: "story",
		});
		expect(stories.map((e) => e.slug)).toEqual(["a"]);
		expect(stories[0]).not.toHaveProperty("lastReviewedAt");
	});

	it("filters by subject and audience together", async () => {
		const user = await asNewUser();
		await seed(user, [
			{
				e: entry("both"),
				facets: [
					["subject", "exams"],
					["audience", "student"],
				],
			},
			{
				e: entry("subjectOnly"),
				facets: [
					["subject", "exams"],
					["audience", "parent"],
				],
			},
			{
				e: entry("audienceOnly"),
				facets: [
					["subject", "grief"],
					["audience", "student"],
				],
			},
			{
				e: entry("retired", { active: false }),
				facets: [
					["subject", "exams"],
					["audience", "student"],
				],
			},
		]);
		const exams = await user.t.query(api.library.entries.listEntries, {
			subject: "exams",
		});
		expect(exams.map((e) => e.slug).sort()).toEqual(["both", "subjectOnly"]);
		const both = await user.t.query(api.library.entries.listEntries, {
			audience: "student",
			subject: "exams",
		});
		expect(both.map((e) => e.slug)).toEqual(["both"]);
	});

	it("caps the result at the requested limit", async () => {
		const user = await asNewUser();
		await seed(user, [{ e: entry("a") }, { e: entry("b") }, { e: entry("c") }]);
		expect(
			await user.t.query(api.library.entries.listEntries, { limit: 2 })
		).toHaveLength(2);
	});
});

describe("library hubs", () => {
	it("resolves items in editorial order, dropping inactive ones", async () => {
		const user = await asNewUser();
		const ids = await seed(user, [
			{ e: entry("one") },
			{ e: entry("two") },
			{ e: entry("off", { active: false }) },
		]);
		await user.root.run(async (ctx) => {
			const audioTrackId = await ctx.db.insert("audio_tracks", {
				active: true,
				durationSec: 60,
				family: "support",
				key: "support/calm.m4a",
				narrators: ["Sage"],
				sha256: "calm",
				slug: "calm",
				sourceTags: [],
				tags: [],
				thumbKey: "thumb/calm.webp",
				thumbSha256: "calm",
				title: "Calm",
				topic: "audio_topic_anxiety",
			});
			await ctx.db.insert("library_hubs", {
				active: true,
				intro: "Start here.",
				items: [
					{ entryId: ids.two, kind: "entry" },
					{ audioTrackId, kind: "audio" },
					{ entryId: ids.off, kind: "entry" },
					{ entryId: ids.one, kind: "entry" },
				],
				slug: "uni",
				title: "Preparing for university",
			});
			await ctx.db.insert("library_hubs", {
				active: false,
				intro: "",
				items: [],
				slug: "hidden",
				title: "H",
			});
		});

		const hubs = await user.t.query(api.library.hubs.listHubs, {});
		expect(hubs.map((h) => h.slug)).toEqual(["uni"]);

		const hub = await user.t.query(api.library.hubs.getHub, { slug: "uni" });
		expect(hub?.title).toBe("Preparing for university");
		expect(
			hub?.items.map((i) => (i.kind === "entry" ? i.entry.slug : i.track.slug))
		).toEqual(["two", "calm", "one"]);

		expect(
			await user.t.query(api.library.hubs.getHub, { slug: "hidden" })
		).toBeNull();
	});

	describe("resized covers (#508)", () => {
		async function viewsOf(cover: Record<string, string>) {
			const user = await asNewUser();
			await user.t.mutation(internal.library.ingest.upsertHub, {
				hub: {
					active: true,
					coverKey: "hub-cover/o.png",
					intro: "",
					items: [],
					slug: "h",
					title: "H",
					...cover,
				},
				sha256: "h1",
			});
			const [listed] = await user.t.query(api.library.hubs.listHubs, {});
			const one = (await user.t.query(api.library.hubs.getHub, { slug: "h" }))!;
			const [home] = (await user.t.query(api.library.home.getHome, {})).hubs;
			return [listed, one, home].map((h) => ({
				coverThumbhash: h.coverThumbhash,
				coverUrl: h.coverUrl,
				thumbUrl: "coverThumbUrl" in h,
			}));
		}

		it("serves the 1280 file and the ThumbHash in list, detail and home views, with no thumb URL", async () => {
			const want = {
				coverThumbhash: "1QcSHQ",
				coverUrl: "https://r2.test/hub-cover/l.webp",
				thumbUrl: false,
			};
			expect(
				await viewsOf({
					cover1280Key: "hub-cover/l.webp",
					coverThumbhash: "1QcSHQ",
				})
			).toEqual([want, want, want]);
		});

		it("a hub without them keeps today's shape", async () => {
			const want = {
				coverThumbhash: undefined,
				coverUrl: "https://r2.test/hub-cover/o.png",
				thumbUrl: false,
			};
			expect(await viewsOf({})).toEqual([want, want, want]);
		});
	});
});

describe("library sources: manifest ingest → getEntry", () => {
	const nhs = {
		attributionText:
			"Contains public sector information licensed under the OGL v3.0",
		dropBrandingIfAdapted: true,
		licence: "OGL v3.0",
		logoUrl: "https://logo.test/nhs.png",
		name: "NHS",
		permission: "not_required" as const,
		slug: "nhs",
		url: "https://www.nhs.uk",
	};
	const mind = {
		...nhs,
		dropBrandingIfAdapted: false,
		licence: "Used with permission",
		logoUrl: "https://logo.test/mind.png",
		name: "Mind",
		slug: "mind",
		url: "https://www.mind.org.uk",
	};
	const xolace = {
		...nhs,
		licence: "Xolace original",
		logoUrl: undefined,
		name: "Xolace",
		slug: "xolace",
		url: undefined,
	};

	type EntryArg = typeof internal.library.ingest.upsertEntry._args.entry;
	type Pair = EntryArg["sources"][number];
	const page = (
		source: string,
		n: number,
		extra: Partial<Pair> = {}
	): Pair => ({
		pageTitle: `${source} page ${n}`,
		pageUrl: `https://${source}.test/${n}`,
		source,
		...extra,
	});
	const record = (extra: Partial<EntryArg> = {}): EntryArg => ({
		active: true,
		dek: "D",
		facets: {},
		kind: "advice",
		lastReviewedAt: 1,
		primarySubject: "anxiety",
		reuse: "adapted",
		slug: "e",
		sources: [page("nhs", 1)],
		title: "T",
		...extra,
	});

	async function setup() {
		const user = await asNewUser();
		for (const source of [nhs, mind, xolace]) {
			await user.t.mutation(internal.library.ingest.upsertSource, {
				sha256: source.slug,
				source,
			});
		}
		const ingest = (e: EntryArg, sha256 = "h1") =>
			user.t.mutation(internal.library.ingest.upsertEntry, {
				entry: e,
				markdown: "body",
				sha256,
			});
		const read = async () =>
			(await user.t.query(api.library.entries.getEntry, { slug: "e" }))
				?.sources;
		return { ingest, read, user };
	}

	it("returns sources in manifest order, the same publisher twice with different pages", async () => {
		const { ingest, read } = await setup();
		await ingest(
			record({
				sources: [
					page("mind", 1, { author: "Jo Baker", retrievedAt: 7 }),
					page("nhs", 1),
					page("nhs", 2),
				],
			})
		);
		expect(await read()).toEqual([
			{
				attributionText: nhs.attributionText,
				author: "Jo Baker",
				licence: "Used with permission",
				logoUrl: "https://logo.test/mind.png",
				name: "Mind",
				pageTitle: "mind page 1",
				pageUrl: "https://mind.test/1",
				retrievedAt: 7,
				url: "https://www.mind.org.uk",
			},
			expect.objectContaining({
				licence: "OGL v3.0",
				name: "NHS",
				pageTitle: "nhs page 1",
			}),
			expect.objectContaining({
				name: "NHS",
				pageTitle: "nhs page 2",
				pageUrl: "https://nhs.test/2",
			}),
		]);
	});

	it("drops a source's logo from an adapted entry when dropBrandingIfAdapted, keeps it verbatim", async () => {
		const { ingest, read } = await setup();
		await ingest(record());
		expect((await read())?.[0]).not.toHaveProperty("logoUrl");
		await ingest(record({ reuse: "verbatim" }), "h2");
		expect((await read())?.[0].logoUrl).toBe(nhs.logoUrl);
	});

	it("enforces the per-reuse source count and rejects an unknown slug", async () => {
		const { ingest, read } = await setup();
		await expect(
			ingest(record({ reuse: "verbatim", sources: [] }))
		).rejects.toThrow(/verbatim.*exactly 1/);
		await expect(
			ingest(
				record({
					reuse: "verbatim",
					sources: [page("nhs", 1), page("mind", 1)],
				})
			)
		).rejects.toThrow(/verbatim.*exactly 1/);
		await expect(
			ingest(record({ reuse: "adapted", sources: [] }))
		).rejects.toThrow(/adapted.*at least 1/);
		await expect(
			ingest(record({ reuse: "original", sources: [page("nhs", 1)] }))
		).rejects.toThrow(/original.*NHS/);
		await expect(
			ingest(record({ sources: [page("nhs", 1), page("ghost", 1)] }))
		).rejects.toThrow(/source "ghost"/);
		expect(await read()).toBeUndefined();

		expect(await ingest(record({ reuse: "original", sources: [] }))).toEqual({
			action: "inserted",
		});
		expect(await read()).toEqual([]);
		expect(
			await ingest(
				record({ reuse: "original", sources: [page("xolace", 1)] }),
				"h2"
			)
		).toEqual({
			action: "updated",
		});
	});

	it("re-ingests a source-list-only edit and leaves no stale pairs", async () => {
		const { user, ingest, read } = await setup();
		await ingest(
			record({ sources: [page("nhs", 1), page("mind", 1), page("nhs", 2)] })
		);
		expect(await ingest(record({ sources: [page("mind", 1)] }), "h2")).toEqual({
			action: "updated",
		});
		expect((await read())?.map((s) => s.pageTitle)).toEqual(["mind page 1"]);
		const pairs = await user.root.run((ctx) =>
			ctx.db.query("library_entry_sources").take(10)
		);
		expect(pairs).toHaveLength(1);
	});

	describe("resized covers (#506)", () => {
		const covers = {
			cover512Key: "library-thumb/s.webp",
			cover1280Key: "library-thumb/l.webp",
			coverKey: "library-thumb/o.png",
		};
		async function views() {
			const { user, ingest } = await setup();
			const viewsOf = async () => {
				const e = (await user.t.query(api.library.entries.getEntry, {
					slug: "e",
				}))!;
				const [item] = await user.t.query(api.library.entries.listEntries, {});
				await user.root.run(async (ctx) => {
					if (!(await ctx.db.query("library_entry_audio").first())) {
						await ctx.db.insert("library_entry_audio", {
							active: true,
							durationSec: 90,
							entryId: e._id,
							key: "a",
							previewKey: "p",
							sha256: "a",
						});
					}
				});
				const audio = (await user.t.query(api.library.audio.getEntryAudio, {
					entryId: e._id,
				}))!;
				return [e, item, audio].map((v) => ({
					coverThumbhash: v.coverThumbhash,
					coverThumbUrl: v.coverThumbUrl,
					coverUrl: v.coverUrl,
				}));
			};
			return { ingest, viewsOf };
		}

		it("serves the 1280 file as coverUrl and the 512 file as coverThumbUrl in entry, list and audio views", async () => {
			const { ingest, viewsOf } = await views();
			await ingest(record(covers));
			const want = {
				coverThumbhash: undefined,
				coverThumbUrl: "https://r2.test/library-thumb/s.webp",
				coverUrl: "https://r2.test/library-thumb/l.webp",
			};
			expect(await viewsOf()).toEqual([want, want, want]);
		});

		it("an entry without resized keys keeps today's shape", async () => {
			const { ingest, viewsOf } = await views();
			await ingest(record({ coverKey: covers.coverKey }));
			const want = {
				coverThumbhash: undefined,
				coverThumbUrl: undefined,
				coverUrl: "https://r2.test/library-thumb/o.png",
			};
			expect(await viewsOf()).toEqual([want, want, want]);
		});

		it("returns the cover ThumbHash (#507) in entry, list and audio views", async () => {
			const { ingest, viewsOf } = await views();
			await ingest(
				record({ ...covers, coverThumbhash: "1QcSHQRnh493V4dIh4eXh1h4kJUI" })
			);
			const views_ = await viewsOf();
			expect(views_.map((v) => v.coverThumbhash)).toEqual(
				Array(3).fill("1QcSHQRnh493V4dIh4eXh1h4kJUI")
			);
		});

		it("re-ingesting the same record with resized keys is a no-op", async () => {
			const { ingest } = await views();
			expect(await ingest(record(covers))).toEqual({ action: "inserted" });
			expect(await ingest(record(covers))).toEqual({ action: "unchanged" });
		});
	});

	it("rejects the old single-source fields", async () => {
		const { ingest } = await setup();
		for (const old of [
			{ sourceSlug: "nhs" },
			{ originalUrl: "https://x" },
			{ author: "A" },
		]) {
			await expect(ingest({ ...record(), ...old } as EntryArg)).rejects.toThrow(
				/Unexpected field/
			);
		}
	});
});
