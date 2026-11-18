import type { Id } from "@xolace/backend/dataModel";
import { describe, expect, it } from "vitest";
import { quietTile, railTiles } from "./rail-model";

type Shelf = Parameters<typeof railTiles>[0];

const item = (slug: string, family: "music" | "support"): Shelf[number] => ({
	_id: slug as Id<"audio_tracks">,
	attribution: undefined,
	family,
	slug,
	thumbhash: undefined,
	thumbUrl: `https://cdn/${slug}.jpg`,
	title: slug,
});

describe("railTiles", () => {
	it("hangs at most four tiles", () => {
		const shelf = ["a", "b", "c", "d", "e"].map((s) => item(s, "support"));
		expect(railTiles(shelf).map((t) => t.slug)).toEqual(["a", "b", "c", "d"]);
	});

	it("names each tile's family", () => {
		const [voice, music] = railTiles([
			item("voice", "support"),
			item("quiet", "music"),
		]);
		expect(voice?.sub).toBe("Support audio");
		expect(music?.sub).toBe("Music");
		expect(music).toMatchObject({
			cover: "https://cdn/quiet.jpg",
			id: "quiet",
		});
	});

	it("is empty with nothing new", () => {
		expect(railTiles([])).toEqual([]);
	});
});

describe("quietTile", () => {
	it("is the rail's first music", () => {
		const tiles = railTiles([
			item("voice", "support"),
			item("quiet", "music"),
			item("rain", "music"),
		]);
		expect(quietTile(tiles)?.slug).toBe("quiet");
	});

	it("is none when the rail has no music", () => {
		expect(quietTile(railTiles([item("voice", "support")]))).toBeNull();
	});
});
