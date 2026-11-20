import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OBSERVE_FILTERED_PARAMS, screenName } from "./screen-name";

const LETTER_ID = "k57ah2mk2gpx4bh4x7zm8j3c9h7v2yq1";

const LETTERS_ROUTES = join(
	import.meta.dirname,
	"..",
	"app",
	"(protected)",
	"letters"
);

function letterRouteParams(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const param = /^\[(?:\.\.\.)?([^\]]+)\]/.exec(entry.name)?.[1];
		const own = param ? [param] : [];
		return entry.isDirectory()
			? [...own, ...letterRouteParams(join(dir, entry.name))]
			: own;
	});
}

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

describe("OBSERVE_FILTERED_PARAMS", () => {
	it("keeps the search query and a letter's id out of navigation metrics", () => {
		expect(OBSERVE_FILTERED_PARAMS).toContain("q");
		expect(OBSERVE_FILTERED_PARAMS).toContain("id");
	});

	it("filters every param the letters routes carry in their path", () => {
		const params = letterRouteParams(LETTERS_ROUTES);
		expect(params).toContain("id");
		for (const param of params) {
			expect(OBSERVE_FILTERED_PARAMS).toContain(param);
		}
	});
});
