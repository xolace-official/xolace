import { describe, expect, it } from "vitest";
import { screenName } from "./screen-name";

/** A Convex document id, as a letter's is. */
const LETTER_ID = "k57ah2mk2gpx4bh4x7zm8j3c9h7v2yq1";

describe("screenName", () => {
	it("reports a letter's reader by its route pattern, never its id", () => {
		expect(screenName(`/letters/read/${LETTER_ID}`)).toBe("/letters/read/[id]");
		expect(screenName(`/letters/read/${LETTER_ID}/`)).toBe(
			"/letters/read/[id]"
		);
	});

	it("never names a letter id among the letters screens", () => {
		const paths = [
			"/letters",
			"/letters/write",
			"/letters/report",
			`/letters/read/${LETTER_ID}`,
		];
		for (const path of paths) {
			expect(screenName(path)).not.toContain(LETTER_ID);
		}
	});

	it("leaves every other path as it is", () => {
		expect(screenName("/today")).toBe("/today");
		expect(screenName("/letters/write")).toBe("/letters/write");
	});
});
