// @vitest-environment edge-runtime
/**
 * Library curator ingest (#406): sha-gated upserts, the consent / safety
 * review hard gates, and the one-off setActive / markSafetyReviewed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import { asUnauthed } from "../test/harness.helpers";
import { ragMock } from "../test/mocks.helpers";

const index = vi.hoisted(() => ({
	added: [] as { namespace: string; key: string; text: string }[],
	deleted: [] as string[],
}));
vi.mock("../rag", () => ragMock({}, index.deleted, index.added));
// Ingest schedules an index job; on fake timers it runs only when a test flushes it.
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	index.added.length = 0;
	index.deleted.length = 0;
});

const source = {
	attributionText:
		"Contains public sector information licensed under the OGL v3.0",
	dropBrandingIfAdapted: true,
	licence: "OGL v3.0",
	name: "NHS",
	permission: "not_required" as const,
	refreshDays: 7,
	slug: "nhs",
};

type EntryArg = typeof internal.library.ingest.upsertEntry._args.entry;

const entry = (slug: string, extra: Partial<EntryArg> = {}): EntryArg => ({
	active: true,
	dek: `Dek ${slug}`,
	facets: { audience: ["student"], emotion: ["anxiety"] },
	kind: "advice",
	lastReviewedAt: 1,
	primarySubject: "anxiety",
	reuse: "adapted",
	slug,
	sources: [
		{
			pageTitle: "Stress",
			pageUrl: "https://www.nhs.uk/stress",
			source: "nhs",
		},
	],
	title: `Title ${slug}`,
	...extra,
});

async function withSource() {
	const t = asUnauthed();
	await t.mutation(internal.library.ingest.upsertSource, {
		sha256: "s1",
		source,
	});
	return t;
}

const ingest = (
	t: ReturnType<typeof asUnauthed>,
	e: EntryArg,
	markdown = "one two three",
	sha256 = "h1"
) =>
	t.mutation(internal.library.ingest.upsertEntry, {
		entry: e,
		markdown,
		sha256,
	});

async function row(t: ReturnType<typeof asUnauthed>, slug: string) {
	return await t.run(async (ctx) => {
		const e = await ctx.db
			.query("library_entries")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (!e) {
			return null;
		}
		const body = await ctx.db
			.query("library_entry_bodies")
			.withIndex("by_entryId", (q) => q.eq("entryId", e._id))
			.unique();
		const facets = await ctx.db
			.query("library_entry_facets")
			.withIndex("by_entryId", (q) => q.eq("entryId", e._id))
			.take(500);
		return { body, e, facets: facets.map((f) => `${f.axis}:${f.slug}`).sort() };
	});
}

describe("upsertSource", () => {
	it("inserts, no-ops on the same sha, updates on a new one", async () => {
		const t = asUnauthed();
		const up = (sha256: string, name = "NHS") =>
			t.mutation(internal.library.ingest.upsertSource, {
				sha256,
				source: { ...source, name },
			});
		expect(await up("a")).toEqual({ action: "inserted" });
		expect(await up("a")).toEqual({ action: "unchanged" });
		expect(await up("b", "NHS UK")).toEqual({ action: "updated" });
	});
});

describe("upsertEntry", () => {
	it("writes entry, body and facets; the same sha is a no-op", async () => {
		const t = await withSource();
		const words = Array.from({ length: 450 }, () => "word").join(" ");
		expect(await ingest(t, entry("a"), words)).toEqual({ action: "inserted" });

		const r = await row(t, "a");
		expect(r?.e.readMin).toBe(3);
		expect(r?.body?.markdown).toBe(words);
		expect(r?.facets).toEqual([
			"audience:student",
			"emotion:anxiety",
			"subject:anxiety",
		]);

		expect(await ingest(t, entry("a"), words)).toEqual({ action: "unchanged" });
		expect((await row(t, "a"))?.facets).toHaveLength(3);
	});

	it("replaces fields, body and facets on a changed sha", async () => {
		const t = await withSource();
		await ingest(t, entry("a"));
		const next = entry("a", { facets: { lifeArea: ["work"] }, title: "New" });
		expect(await ingest(t, next, "new body", "h2")).toEqual({
			action: "updated",
		});
		const r = await row(t, "a");
		expect(r?.e.title).toBe("New");
		expect(r?.body?.markdown).toBe("new body");
		expect(r?.facets).toEqual(["lifeArea:work", "subject:anxiety"]);
	});

	it("writes lowercase search text from the record and its facets, refreshed on update", async () => {
		const t = await withSource();
		await ingest(
			t,
			entry("a", {
				facets: { lifeArea: ["self-worth"] },
				storyDescriptor: "A second-year student",
				title: "Exam Nerves",
			})
		);
		expect((await row(t, "a"))?.e.searchText).toBe(
			"exam nerves dek a a second year student self worth anxiety"
		);

		await ingest(
			t,
			entry("a", { facets: { audience: ["student"] }, title: "Exam Dread" }),
			"x",
			"h2"
		);
		expect((await row(t, "a"))?.e.searchText).toBe(
			"exam dread dek a student anxiety"
		);
	});

	it("rejects an unknown source and an off-vocabulary emotion/lifeArea facet", async () => {
		const t = await withSource();
		await expect(
			ingest(t, entry("a", { sources: [{ pageTitle: "x", source: "nope" }] }))
		).rejects.toThrow(/source "nope"/);
		await expect(
			ingest(t, entry("b", { facets: { emotion: ["meh"] } }))
		).rejects.toThrow(/emotion "meh"/);
		expect(await row(t, "a")).toBeNull();
		expect(await row(t, "b")).toBeNull();
	});

	it("hard-fails a first-hand story with no consentRecordedAt", async () => {
		const t = await withSource();
		const story = entry("s", {
			active: false,
			kind: "story",
			reuse: "original",
			sources: [],
		});
		await expect(ingest(t, story)).rejects.toThrow(/consentRecordedAt/);
		expect(await row(t, "s")).toBeNull();
		expect(await ingest(t, { ...story, consentRecordedAt: 5 })).toEqual({
			action: "inserted",
		});
	});

	it("gates an active explainer on a safety review of the current body", async () => {
		const t = await withSource();
		const draft = entry("x", { active: false, kind: "explainer" });
		const live = { ...draft, active: true };

		await expect(ingest(t, live)).rejects.toThrow(/safetyReviewedAt/);
		expect(await ingest(t, draft)).toEqual({ action: "inserted" });
		await t.mutation(internal.library.admin.markSafetyReviewed, { slug: "x" });
		expect(await ingest(t, live, "one two three", "h2")).toEqual({
			action: "updated",
		});

		// A body edit can't go live unreviewed: the live row keeps the reviewed body.
		await expect(ingest(t, live, "edited", "h3")).rejects.toThrow(
			/safetyReviewedAt/
		);
		expect((await row(t, "x"))?.body?.markdown).toBe("one two three");

		// Landing the edit inactive clears the stale review.
		await ingest(t, draft, "edited", "h4");
		expect((await row(t, "x"))?.e.safetyReviewedAt).toBeUndefined();
	});
});

describe("upsertHub", () => {
	it("resolves item slugs in order and rejects an unknown one", async () => {
		const t = await withSource();
		await ingest(t, entry("a"));
		await ingest(t, entry("b"));
		const hub = (refs: string[]) => ({
			active: true,
			intro: "Intro",
			items: refs.map((ref) => ({ kind: "entry" as const, ref })),
			slug: "uni",
			title: "Preparing for university",
		});

		await expect(
			t.mutation(internal.library.ingest.upsertHub, {
				hub: hub(["a", "ghost"]),
				sha256: "1",
			})
		).rejects.toThrow(/entry "ghost"/);
		expect(
			await t.mutation(internal.library.ingest.upsertHub, {
				hub: hub(["b", "a"]),
				sha256: "1",
			})
		).toEqual({
			action: "inserted",
		});
		const items = await t.run(async (ctx) => {
			const h = await ctx.db
				.query("library_hubs")
				.withIndex("by_slug", (q) => q.eq("slug", "uni"))
				.unique();
			return Promise.all(
				h!.items.map(async (i) =>
					i.kind === "entry"
						? (await ctx.db.get("library_entries", i.entryId))?.slug
						: null
				)
			);
		});
		expect(items).toEqual(["b", "a"]);
		expect(
			await t.mutation(internal.library.ingest.upsertHub, {
				hub: hub(["b", "a"]),
				sha256: "1",
			})
		).toEqual({
			action: "unchanged",
		});
	});
});

describe("setActive", () => {
	it("flips an entry, and refuses to publish one that fails its gate", async () => {
		const t = await withSource();
		await ingest(t, entry("a"));
		await ingest(t, entry("x", { active: false, kind: "explainer" }));

		await t.mutation(internal.library.admin.setActive, {
			active: false,
			slug: "a",
		});
		expect((await row(t, "a"))?.e.active).toBe(false);
		await expect(
			t.mutation(internal.library.admin.setActive, { active: true, slug: "x" })
		).rejects.toThrow(/safetyReviewedAt/);
		await expect(
			t.mutation(internal.library.admin.setActive, {
				active: true,
				slug: "ghost",
			})
		).rejects.toThrow(/ghost/);
	});
});

describe("library index (#568)", () => {
	it("embeds an active entry's title, dek and body; retiring it removes it", async () => {
		const t = await withSource();
		await ingest(t, entry("a"), "the body words");
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		const id = (await row(t, "a"))!.e._id;
		expect(index.added).toEqual([
			{
				key: id,
				namespace: "library",
				text: "Title a\n\nDek a\n\nthe body words",
			},
		]);

		await t.mutation(internal.library.admin.setActive, {
			active: false,
			slug: "a",
		});
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(index.deleted).toEqual([id]);
		expect(index.added).toHaveLength(1);
	});

	it("never embeds an entry ingested inactive", async () => {
		const t = await withSource();
		await ingest(t, entry("off", { active: false }));
		await t.finishAllScheduledFunctions(vi.runAllTimers);
		expect(index.added).toEqual([]);
	});
});
