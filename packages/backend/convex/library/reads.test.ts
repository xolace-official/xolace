// @vitest-environment edge-runtime
/**
 * Lantern's Saved list (`library.reads.listSaved`) and the read mark
 * (`finished`, `position`) every entry card now carries.
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
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

type EntryId = Id<"library_entries">;
type Read = Omit<
	Doc<"library_reads">,
	"_id" | "_creationTime" | "emotionalProfileId" | "entryId"
>;

const PAGE = { cursor: null, numItems: 20 };

/** Inserts bare active entries (list reads need no body or source). */
const seedEntries = (user: SeededUser, slugs: string[], active = true) =>
	user.root.run(async (ctx) => {
		const ids: Record<string, EntryId> = {};
		for (const slug of slugs) {
			ids[slug] = await ctx.db.insert("library_entries", {
				active,
				dek: `Dek ${slug}`,
				kind: "advice",
				lastReviewedAt: 1,
				primarySubject: "anxiety",
				readMin: 4,
				reuse: "adapted",
				slug,
				title: `Title ${slug}`,
			});
		}
		return ids;
	});

/** Writes a read row directly, for states `record` can't produce (pre-`savedAt` saves). */
const insertRead = (user: SeededUser, entryId: EntryId, read: Partial<Read>) =>
	user.root.run((ctx) =>
		ctx.db.insert("library_reads", {
			emotionalProfileId: user.profileId,
			entryId,
			helped: false,
			saved: false,
			...read,
		})
	);

const save = (user: SeededUser, entryId: EntryId, saved = true) =>
	user.t.mutation(api.library.reads.record, { entryId, saved });

const savedSlugs = async (user: SeededUser) =>
	(
		await user.t.query(api.library.reads.listSaved, { paginationOpts: PAGE })
	).page.map((i) => i.slug);

/** Saves each slug in turn, a minute apart, so the order is unambiguous. */
async function saveInOrder(
	user: SeededUser,
	ids: Record<string, EntryId>,
	slugs: string[]
) {
	vi.useFakeTimers({ now: Date.UTC(2026, 10, 16, 9), toFake: ["Date"] });
	for (const slug of slugs) {
		vi.advanceTimersByTime(60_000);
		await save(user, ids[slug]);
	}
}

describe("library.reads.listSaved", () => {
	it("lists saved entries newest saved first, in the card shape", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["a", "b", "c", "unsaved"]);
		// Rows exist in a, b, c order first, so only savedAt can give c, a, b.
		for (const slug of ["a", "b", "c"]) {
			await insertRead(user, ids[slug], {});
		}
		await saveInOrder(user, ids, ["b", "a", "c"]);

		const { page, isDone } = await user.t.query(api.library.reads.listSaved, {
			paginationOpts: PAGE,
		});
		expect(isDone).toBe(true);
		expect(page.map((i) => i.slug)).toEqual(["c", "a", "b"]);
		expect(page[0]).toEqual({
			_id: ids.c,
			dek: "Dek c",
			finished: false,
			kind: "advice",
			primarySubject: "anxiety",
			readMin: 4,
			saved: true,
			slug: "c",
			title: "Title c",
			views: 0,
		});
	});

	it("drops an unsaved entry; saving it again puts it back on top", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["a", "b", "c"]);
		await saveInOrder(user, ids, ["a", "b", "c"]);

		await save(user, ids.b, false);
		expect(await savedSlugs(user)).toEqual(["c", "a"]);
		const row = await user.root.run((ctx) =>
			ctx.db
				.query("library_reads")
				.withIndex("by_emotionalProfileId_and_entryId", (q) =>
					q.eq("emotionalProfileId", user.profileId).eq("entryId", ids.b)
				)
				.unique()
		);
		expect(row?.savedAt).toBeUndefined();

		vi.advanceTimersByTime(60_000);
		await save(user, ids.b);
		expect(await savedSlugs(user)).toEqual(["b", "c", "a"]);
	});

	it("saving an already saved entry keeps its place", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["a", "b"]);
		await saveInOrder(user, ids, ["a", "b"]);

		vi.advanceTimersByTime(60_000);
		await save(user, ids.a);
		expect(await savedSlugs(user)).toEqual(["b", "a"]);
	});

	it("lists saves from before savedAt after the dated ones", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["old", "new"]);
		await insertRead(user, ids.old, { saved: true });
		await save(user, ids.new);

		expect(await savedSlugs(user)).toEqual(["new", "old"]);
	});

	it("leaves out retracted and deleted entries", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["kept", "deleted"]);
		const { gone } = await seedEntries(user, ["gone"], false);
		await insertRead(user, gone, { saved: true, savedAt: 3 });
		await insertRead(user, ids.deleted, { saved: true, savedAt: 2 });
		await insertRead(user, ids.kept, { saved: true, savedAt: 1 });
		await user.root.run((ctx) => ctx.db.delete("library_entries", ids.deleted));

		expect(await savedSlugs(user)).toEqual(["kept"]);
	});

	it("carries each saved entry's finished and position", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["done", "partway", "unread"]);
		await insertRead(user, ids.done, {
			finishedAt: 5,
			position: 1,
			saved: true,
			savedAt: 3,
		});
		await insertRead(user, ids.partway, {
			position: 0.4,
			saved: true,
			savedAt: 2,
		});
		await insertRead(user, ids.unread, { saved: true, savedAt: 1 });

		const { page } = await user.t.query(api.library.reads.listSaved, {
			paginationOpts: PAGE,
		});
		expect(
			page.map(({ slug, finished, position }) => ({ finished, position, slug }))
		).toEqual([
			{ finished: true, position: 1, slug: "done" },
			{ finished: false, position: 0.4, slug: "partway" },
			{ finished: false, position: undefined, slug: "unread" },
		]);
		expect("position" in page[2]).toBe(false);
	});

	it("requires sign-in", async () => {
		await expect(
			asUnauthed().query(api.library.reads.listSaved, { paginationOpts: PAGE })
		).rejects.toThrow();
	});

	it("shows each reader only their own saves", async () => {
		const one = await asNewUser(1);
		const two = await asNewUser(2, one.root);
		const ids = await seedEntries(one, ["mine", "theirs"]);
		await save(one, ids.mine);
		await save(two, ids.theirs);

		expect(await savedSlugs(one)).toEqual(["mine"]);
		expect(await savedSlugs(two)).toEqual(["theirs"]);
	});

	it("reads at most 100 rows a page and pages through the rest", async () => {
		const user = await asNewUser();
		const slugs = Array.from({ length: 103 }, (_, i) => `e${i}`);
		const ids = await seedEntries(user, slugs);
		await user.root.run(async (ctx) => {
			for (const [i, slug] of slugs.entries()) {
				await ctx.db.insert("library_reads", {
					emotionalProfileId: user.profileId,
					entryId: ids[slug],
					helped: false,
					saved: true,
					savedAt: i,
				});
			}
		});

		const first = await user.t.query(api.library.reads.listSaved, {
			paginationOpts: { cursor: null, numItems: 1000 },
		});
		expect(first.page).toHaveLength(100);
		expect(first.isDone).toBe(false);
		expect(first.page[0].slug).toBe("e102");

		const rest = await user.t.query(api.library.reads.listSaved, {
			paginationOpts: { cursor: first.continueCursor, numItems: 1000 },
		});
		expect(rest.page.map((i) => i.slug)).toEqual(["e2", "e1", "e0"]);
		expect(rest.isDone).toBe(true);

		const one = await user.t.query(api.library.reads.listSaved, {
			paginationOpts: { cursor: null, numItems: 0 },
		});
		expect(one.page).toHaveLength(1);

		const nan = await user.t.query(api.library.reads.listSaved, {
			paginationOpts: { cursor: null, numItems: Number.NaN },
		});
		expect(nan.page).toHaveLength(100);
	});
});

describe("the read mark on entry cards", () => {
	it("adds finished and position beside saved on the other lists", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["done", "partway", "unread"]);
		await insertRead(user, ids.done, { finishedAt: 5, position: 1 });
		await insertRead(user, ids.partway, { position: 0.4, saved: true });

		const items = await user.t.query(api.library.entries.listEntries, {});
		const bySlug = Object.fromEntries(items.map((i) => [i.slug, i]));
		expect(bySlug.done).toMatchObject({
			finished: true,
			position: 1,
			saved: false,
		});
		expect(bySlug.partway).toMatchObject({
			finished: false,
			position: 0.4,
			saved: true,
		});
		expect(bySlug.unread.finished).toBe(false);
		expect("position" in bySlug.unread).toBe(false);
	});

	it("keeps every field old clients read, and adds only finished and position", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["partway"]);
		await insertRead(user, ids.partway, { position: 0.4, saved: true });

		const [item] = await user.t.query(api.library.entries.listEntries, {});
		expect(Object.keys(item).sort()).toEqual(
			[
				// The card shape before the read mark.
				"_id",
				"dek",
				"kind",
				"primarySubject",
				"readMin",
				"saved",
				"slug",
				"title",
				"views",
				// Added, both optional in the validator.
				"finished",
				"position",
			].sort()
		);
		expect(
			await user.t.query(api.library.reads.getReaderState, {
				entryId: ids.partway,
			})
		).toEqual({
			finished: false,
			helped: false,
			helpedCount: null,
			position: 0.4,
			saved: true,
		});
	});
});

describe("migrations:backfillLibrarySavedAt", () => {
	it("dates saved rows that have no savedAt from their creation, and nothing else", async () => {
		const user = await asNewUser();
		const ids = await seedEntries(user, ["undated", "dated", "unsaved"]);
		// lastReadAt and viewedAt are later than creation; the backfill ignores them.
		const undated = await insertRead(user, ids.undated, {
			lastReadAt: Date.now() + 1000,
			saved: true,
			viewedAt: Date.now() + 500,
		});
		const dated = await insertRead(user, ids.dated, {
			saved: true,
			savedAt: 7,
		});
		const unsaved = await insertRead(user, ids.unsaved, {});

		await user.root.mutation(internal.migrations.backfillLibrarySavedAt, {
			batchSize: 100,
			cursor: null,
			dryRun: false,
			oneBatchOnly: true,
		});

		const rows = await user.root.run(async (ctx) => ({
			dated: await ctx.db.get("library_reads", dated),
			undated: await ctx.db.get("library_reads", undated),
			unsaved: await ctx.db.get("library_reads", unsaved),
		}));
		expect(rows.undated?.savedAt).toBe(rows.undated?._creationTime);
		expect(rows.dated?.savedAt).toBe(7);
		expect(rows.unsaved?.savedAt).toBeUndefined();
	});
});
