// @vitest-environment edge-runtime
/**
 * #690: badge art per deployment. What can go wrong: a re-run of the upload
 * script duplicates a row or leaves the old image behind, a typo'd artKey
 * lands a row nothing reads, or a badge with no art yet shows a broken image
 * instead of the locked silhouette.
 */
import { describe, expect, it } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asUnauthed } from "../test/harness.helpers";
import { badgeArt } from "./art";
import { BADGE_ART_FALLBACK } from "./catalog";

const THUMBHASH = "1QcSHQRnh493V4dIh4eXh1h4kJUI";
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

type T = ReturnType<typeof asUnauthed>;

const storeImage = (t: T): Promise<Id<"_storage">> =>
	t.run((ctx) => ctx.storage.store(new Blob(["webp"], { type: "image/webp" })));

async function upload(t: T, artKey: string, sha256 = SHA_A) {
	const storageId = await storeImage(t);
	const action = await t.mutation(internal.achievements.art.upsertArt, {
		artKey,
		sha256,
		storageId,
		thumbhash: THUMBHASH,
	});
	return { action, storageId };
}

const resolve = (t: T, artKey: string) => t.run((ctx) => badgeArt(ctx, artKey));

describe("upsertArt", () => {
	it("stores an image under its artKey, served with its thumbhash", async () => {
		const t = asUnauthed();
		const { action } = await upload(t, "joined");

		expect(action).toBe("inserted");
		const art = await resolve(t, "joined");
		expect(art.fallback).toBe(false);
		expect(art.thumbhash).toBe(THUMBHASH);
		expect(art.url).toEqual(expect.any(String));
	});

	it("replaces the row on a re-run and deletes the image it pointed at", async () => {
		const t = asUnauthed();
		const first = await upload(t, "joined", SHA_A);
		const second = await upload(t, "joined", SHA_B);

		expect(second.action).toBe("updated");
		const live = await t.query(internal.achievements.art.listArt, {});
		expect(live).toEqual([{ artKey: "joined", sha256: SHA_B }]);
		const oldUrl = await t.run((ctx) => ctx.storage.getUrl(first.storageId));
		expect(oldUrl).toBeNull();
	});

	it("rejects an artKey the catalog never shows", async () => {
		const t = asUnauthed();
		await expect(upload(t, "streak-year-6")).rejects.toThrow(/artKey/);
		expect(await t.query(internal.achievements.art.listArt, {})).toEqual([]);
	});

	it("accepts the fallback image", async () => {
		const t = asUnauthed();
		expect((await upload(t, BADGE_ART_FALLBACK)).action).toBe("inserted");
	});
});

describe("badgeArt", () => {
	it("falls back to the locked silhouette for an artKey with no row", async () => {
		const t = asUnauthed();
		await upload(t, BADGE_ART_FALLBACK);

		const art = await resolve(t, "streak-kindling-2");
		expect(art.fallback).toBe(true);
		expect(art.url).toEqual(expect.any(String));
		expect(art.thumbhash).toBe(THUMBHASH);
	});

	it("has no URL when not even the fallback is uploaded", async () => {
		const t = asUnauthed();
		expect(await resolve(t, "joined")).toEqual({
			fallback: true,
			thumbhash: null,
			url: null,
		});
	});
});
