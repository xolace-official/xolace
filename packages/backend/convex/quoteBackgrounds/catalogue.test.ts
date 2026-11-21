// @vitest-environment edge-runtime
/**
 * The quote backgrounds catalogue (B18).
 *
 * Failure modes:
 *  1. The sheet gets backgrounds out of order, retired ones, or a loop with
 *     nothing to play (no video or poster yet, or a deleted blob).
 *  2. A re-run of the upload script duplicates a row, erases a file it
 *     didn't send, or leaves a replaced blob behind.
 *  3. A still is given hosted media, or a typo'd key or bad hash lands.
 *  4. Signed out, the list answers.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { expectCode } from "../test/fixtures.helpers";
import { asNewUser, asUnauthed } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

type T = ReturnType<typeof asUnauthed>;

const SHA = (c: string) => c.repeat(64);

const store = (t: T, type: string): Promise<Id<"_storage">> =>
	t.run((ctx) => ctx.storage.store(new Blob([type], { type })));

const still = (key: string, order: number, plus = false) => ({
	active: true,
	ink: "light" as const,
	key,
	kind: "still" as const,
	name: key,
	order,
	plus,
});

async function loopFiles(t: T, sha = "a") {
	return {
		audio: { sha256: SHA(sha), storageId: await store(t, "audio/mp4") },
		poster: { sha256: SHA(sha), storageId: await store(t, "image/webp") },
		video: { sha256: SHA(sha), storageId: await store(t, "video/mp4") },
	};
}

const upsert = (
	t: T,
	args: Parameters<
		typeof t.mutation<typeof internal.quoteBackgrounds.catalogue.upsert>
	>[1]
) => t.mutation(internal.quoteBackgrounds.catalogue.upsert, args);

const loop = (key: string, order: number, plus = true) => ({
	...still(key, order, plus),
	kind: "loop" as const,
});

const exists = (t: T, id: Id<"_storage">) =>
	t.run(async (ctx) => (await ctx.storage.getUrl(id)) !== null);

describe("list", () => {
	it("returns the active backgrounds in order, loops with their URLs", async () => {
		const user = await asNewUser();
		const t = user.root;
		await upsert(t, { ...loop("quiet-lake", 3), ...(await loopFiles(t)) });
		await upsert(t, { ...still("poster", 0), ink: "dark" });
		await upsert(t, still("night", 2));
		await upsert(t, still("dunes", 1, true));
		await upsert(t, { ...still("retired", 4), active: false });

		const list = await user.t.query(api.quoteBackgrounds.catalogue.list, {});
		expect(list.map((b) => b.key)).toEqual([
			"poster",
			"dunes",
			"night",
			"quiet-lake",
		]);
		expect(list[0]).toEqual({
			ink: "dark",
			key: "poster",
			kind: "still",
			name: "poster",
			plus: false,
		});
		expect(list[1].plus).toBe(true);
		expect(list[3]).toMatchObject({
			audioUrl: expect.any(String),
			kind: "loop",
			plus: true,
			posterUrl: expect.any(String),
			videoUrl: expect.any(String),
		});
	});

	it("leaves out a loop with no video or poster, and serves one without sound", async () => {
		const user = await asNewUser();
		const t = user.root;
		const files = await loopFiles(t);
		await upsert(t, loop("no-media", 0));
		await upsert(t, { ...loop("no-poster", 1), video: files.video });
		await upsert(t, {
			...loop("silent", 2),
			poster: files.poster,
			video: files.video,
		});
		const gone = await loopFiles(t, "b");
		await upsert(t, { ...loop("deleted-blob", 3), ...gone });
		await t.run((ctx) => ctx.storage.delete(gone.video.storageId));

		const list = await user.t.query(api.quoteBackgrounds.catalogue.list, {});
		expect(list.map((b) => b.key)).toEqual(["silent"]);
		expect(list[0]).not.toHaveProperty("audioUrl");
	});

	it("refuses signed out", async () => {
		await expectCode(
			() => asUnauthed().query(api.quoteBackgrounds.catalogue.list, {}),
			"not_authenticated"
		);
	});
});

describe("upsert", () => {
	it("updates a row in place, keeping the files it wasn't sent", async () => {
		const t = asUnauthed();
		const files = await loopFiles(t);
		expect(await upsert(t, { ...loop("hearth", 0), ...files })).toBe(
			"inserted"
		);
		expect(
			await upsert(t, { ...loop("hearth", 5, false), name: "Hearth" })
		).toBe("updated");

		const live = await t.query(
			internal.quoteBackgrounds.catalogue.listForUpload,
			{}
		);
		expect(live).toEqual([
			{
				active: true,
				audio: SHA("a"),
				key: "hearth",
				poster: SHA("a"),
				video: SHA("a"),
			},
		]);
		const row = await t.run((ctx) =>
			ctx.db.query("quote_backgrounds").unique()
		);
		expect(row).toMatchObject({ name: "Hearth", order: 5, plus: false });
	});

	it("deletes the blob a new file replaces, and only that one", async () => {
		const t = asUnauthed();
		const first = await loopFiles(t, "a");
		await upsert(t, { ...loop("stream", 0), ...first });
		const video = { sha256: SHA("c"), storageId: await store(t, "video/mp4") };
		await upsert(t, { ...loop("stream", 0), video });

		expect(await exists(t, first.video.storageId)).toBe(false);
		expect(await exists(t, first.poster.storageId)).toBe(true);
		expect(await exists(t, first.audio.storageId)).toBe(true);
		expect(await exists(t, video.storageId)).toBe(true);
	});

	it("drops a loop's media when it becomes a still", async () => {
		const t = asUnauthed();
		const files = await loopFiles(t);
		await upsert(t, { ...loop("dunes", 0), ...files });
		await upsert(t, still("dunes", 0));

		const row = await t.run((ctx) =>
			ctx.db.query("quote_backgrounds").unique()
		);
		expect(row?.kind).toBe("still");
		expect(row?.video).toBeUndefined();
		expect(await exists(t, files.video.storageId)).toBe(false);
	});

	it("refuses media on a still, a bad key, a bad hash and a missing upload", async () => {
		const t = asUnauthed();
		const files = await loopFiles(t);
		await expect(
			upsert(t, { ...still("dunes", 0), poster: files.poster })
		).rejects.toThrow(/no hosted media/);
		await expect(upsert(t, still("Quiet Lake", 0))).rejects.toThrow(
			/kebab-case/
		);
		await expect(
			upsert(t, { ...still("dunes", 0), name: " " })
		).rejects.toThrow(/name/);
		await expect(
			upsert(t, {
				...loop("stream", 0),
				video: { ...files.video, sha256: "nope" },
			})
		).rejects.toThrow(/SHA-256/);
		await t.run((ctx) => ctx.storage.delete(files.video.storageId));
		await expect(
			upsert(t, { ...loop("stream", 0), video: files.video })
		).rejects.toThrow(/no such upload/);
		expect(
			await t.query(internal.quoteBackgrounds.catalogue.listForUpload, {})
		).toEqual([]);
	});
});

describe("retire", () => {
	it("takes a background off the list and keeps its row", async () => {
		const user = await asNewUser();
		const t = user.root;
		await upsert(t, still("dunes", 0));
		await t.mutation(internal.quoteBackgrounds.catalogue.retire, {
			key: "dunes",
		});

		expect(await user.t.query(api.quoteBackgrounds.catalogue.list, {})).toEqual(
			[]
		);
		const live = await t.query(
			internal.quoteBackgrounds.catalogue.listForUpload,
			{}
		);
		expect(live).toEqual([{ active: false, key: "dunes" }]);
		await expect(
			t.mutation(internal.quoteBackgrounds.catalogue.retire, { key: "nope" })
		).rejects.toThrow(/no background/);
	});
});
