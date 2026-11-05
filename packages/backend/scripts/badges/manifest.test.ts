/**
 * #691: the manifest is the record of which generation was approved for each
 * artKey. What can go wrong: an image lands with no record of the generation
 * it came from, an artKey typo uploads art no badge ever shows, or one artKey
 * is listed twice and the second silently wins.
 */
import { describe, expect, it } from "vitest";
import {
	BADGE_ART_FALLBACK,
	BADGE_ART_KEYS,
} from "../../convex/achievements/catalog";
import { parseManifest } from "./manifest";
import committed from "./manifest.json";

const JOINED = {
	artKey: "joined",
	generationId: "Yxztu067tzOtCXx25f2p",
	source: "joined.png",
};

describe("parseManifest", () => {
	it("keeps each artKey's source and approved generation", () => {
		expect(parseManifest([JOINED])).toEqual([JOINED]);
	});

	it("rejects an entry with no approved generation recorded", () => {
		expect(() =>
			parseManifest([{ artKey: "joined", source: "joined.png" }])
		).toThrow("{ artKey, source, generationId }");
		expect(() => parseManifest([{ ...JOINED, generationId: "" }])).toThrow(
			"{ artKey, source, generationId }"
		);
	});

	it("rejects an entry with no source image", () => {
		expect(() => parseManifest([{ ...JOINED, source: "" }])).toThrow(
			"{ artKey, source, generationId }"
		);
	});

	it("rejects an artKey no badge shows", () => {
		expect(() =>
			parseManifest([{ ...JOINED, artKey: "streak-spark-4" }])
		).toThrow('"streak-spark-4" isn\'t a badge artKey');
	});

	it("rejects an artKey listed twice", () => {
		expect(() => parseManifest([JOINED, JOINED])).toThrow(
			'"joined" is listed twice'
		);
	});
});

describe("the committed manifest", () => {
	it("has an approved image for every artKey, and the fallback", () => {
		const listed = parseManifest(committed).map((e) => e.artKey);
		expect(new Set(listed)).toEqual(
			new Set([...BADGE_ART_KEYS, BADGE_ART_FALLBACK])
		);
	});
});
