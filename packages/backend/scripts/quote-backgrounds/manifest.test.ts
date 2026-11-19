/**
 * B18: the manifest is the catalogue every deployment is made to match. What
 * can go wrong: a typo'd key uploads a background the app never draws, a key
 * is listed twice and the second silently wins, Poster (the default) goes
 * missing, or the committed list drifts from the owner's free set.
 */
import { describe, expect, it } from "vitest";
import { parseManifest, pick } from "./manifest";
import committed from "./manifest.json";

const POSTER = {
	ink: "dark",
	key: "poster",
	kind: "still",
	name: "Poster",
	plus: false,
};

describe("parseManifest", () => {
	it("keeps each background as listed", () => {
		expect(parseManifest([POSTER])).toEqual([POSTER]);
	});

	it("rejects a malformed entry", () => {
		for (const bad of [
			{ ...POSTER, kind: "gif" },
			{ ...POSTER, ink: "grey" },
			{ ...POSTER, plus: "no" },
			{ ...POSTER, name: " " },
		]) {
			expect(() => parseManifest([bad])).toThrow(
				"{ key, name, kind, ink, plus }"
			);
		}
	});

	it("rejects a key that isn't kebab-case, a duplicate, and a list without Poster", () => {
		expect(() =>
			parseManifest([POSTER, { ...POSTER, key: "Quiet_Lake" }])
		).toThrow("kebab-case");
		expect(() => parseManifest([POSTER, POSTER])).toThrow("listed twice");
		expect(() => parseManifest([{ ...POSTER, key: "night" }])).toThrow(
			"Poster"
		);
	});
});

describe("pick", () => {
	it("narrows to --only, refusing keys the manifest lacks", () => {
		const list = parseManifest(committed);
		expect(pick(list, ["night"]).map((e) => e.key)).toEqual(["night"]);
		expect(pick(list, undefined)).toHaveLength(list.length);
		expect(() => pick(list, ["aurora"])).toThrow("aurora");
	});
});

describe("the committed manifest", () => {
	const list = parseManifest(committed);

	it("offers Poster, Night, First light and Rain on glass free, and nothing else", () => {
		expect(list.filter((e) => !e.plus).map((e) => e.key)).toEqual([
			"poster",
			"first-light",
			"night",
			"rain-window",
		]);
	});

	it("lists only the backgrounds whose art has landed: sixteen stills and five loops, besides Poster and Night", () => {
		const stills = list.filter((e) => e.kind === "still");
		expect(stills).toHaveLength(18);
		expect(list.filter((e) => e.kind === "loop").map((e) => e.key)).toEqual([
			"rain-window",
			"quiet-lake",
			"shoreline",
			"hearth",
			"forest-rain",
		]);
	});

	it("gives the pale art dark ink, and everything else light", () => {
		const dark = list.filter((e) => e.ink === "dark").map((e) => e.key);
		expect(dark).toEqual(["poster", "ink-wash", "watercolour"]);
	});
});
