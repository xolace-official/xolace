import { describe, expect, it } from "vitest";
import {
	PAPER_SCRIM,
	SCRIM,
	scrimOf,
	TILE_VEIL,
	tileVeilOf,
} from "./quotes-palette";

const alpha = (rgba: string) =>
	Number(rgba.split(",").at(-1)?.replace(")", ""));

describe("scrimOf", () => {
	it("keeps the dark scrim for light ink, Night included", () => {
		expect(scrimOf({ ink: "light" })).toBe(SCRIM);
		expect(scrimOf({ drawn: "night", ink: "light" })).toBe(SCRIM);
	});

	it("lays paper under dark ink on an image", () => {
		expect(scrimOf({ ink: "dark" })).toBe(PAPER_SCRIM);
	});

	it("leaves Poster bare", () => {
		expect(scrimOf({ drawn: "poster", ink: "dark" })).toBeNull();
		expect(tileVeilOf({ drawn: "poster", ink: "dark" })).toBeNull();
	});

	it("picks the tile veil by ink", () => {
		expect(tileVeilOf({ ink: "light" })).toBe(TILE_VEIL.light);
		expect(tileVeilOf({ ink: "dark" })).toBe(TILE_VEIL.dark);
	});
});

describe("PAPER_SCRIM", () => {
	it("fades over the same regions as the dark scrim, softer at every stop", () => {
		expect(PAPER_SCRIM.locations).toEqual(SCRIM.locations);
		PAPER_SCRIM.colors.forEach((c, i) => {
			expect(alpha(c)).toBeLessThan(alpha(SCRIM.colors[i]));
		});
	});
});
