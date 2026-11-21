import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFiles } from "../../scripts/themes/test-files";

const root = `${import.meta.dirname}/../..`;
const WRITES_NATIVE = /Uniwind\.setTheme|Appearance\.setColorScheme/;
const APPLY_THEME = /\bapplyTheme\(/;
const MODULE = "src/lib/native-appearance.ts";

const matching = (pattern: RegExp) =>
	sourceFiles()
		.filter((file) => !file.endsWith(".test.ts"))
		.filter((file) => pattern.test(readFileSync(file, "utf8")))
		.map((file) => relative(root, file))
		.sort();

describe("theme switching", () => {
	it("writes the theme and native appearance only in lib/native-appearance.ts, which holds them for the launch cover", () => {
		expect(matching(WRITES_NATIVE)).toEqual([MODULE]);
	});

	it("goes through setThemeWithFonts, so text never draws before its face is loaded", () => {
		expect(matching(APPLY_THEME)).toEqual([
			"src/design/fonts.ts",
			MODULE,
			"src/lib/theme-bootstrap.ts",
		]);
	});
});
