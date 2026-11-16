import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceFiles } from "../../scripts/themes/test-files";

const root = `${import.meta.dirname}/../..`;
const SET_THEME = /Uniwind\.setTheme\(/;

/** fonts.ts owns the switch; theme-bootstrap runs before the launch gate loads the pair. */
const ALLOWED = ["src/design/fonts.ts", "src/lib/theme-bootstrap.ts"];

describe("theme switching", () => {
	it("goes through setThemeWithFonts, so text never draws before its face is loaded", () => {
		const callers = sourceFiles()
			.filter((file) => !file.endsWith(".test.ts"))
			.filter((file) => SET_THEME.test(readFileSync(file, "utf8")))
			.map((file) => relative(root, file));
		expect(callers.sort()).toEqual(ALLOWED);
	});
});
