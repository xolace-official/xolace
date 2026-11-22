import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VARIANTS } from "../../src/design/themes";
import {
	buildPalettes,
	buildVariant,
	HEROUI,
	REQUIRED,
	renderThemeNames,
	renderThemesCss,
} from "./build";
import { declared, heroStyles, read } from "./test-files";

const UNIWIND_THEMES = /themes: readonly \[([^\]]*)\]/;
const QUOTED = /'([^']+)'/g;
const HEX = /^#/;

describe("theme generator", () => {
	it("committed files are what the registry builds (run `bun run themes`)", () => {
		expect(read("src/themes/themes.generated.css")).toBe(renderThemesCss());
		expect(read("src/design/theme-names.generated.json")).toBe(
			renderThemeNames()
		);
	});

	it("registers every variant with Uniwind, in the generated order", () => {
		const types = read("src/uniwind-types.d.ts");
		const listed = types.match(UNIWIND_THEMES)?.[1] ?? "";
		const names = [...listed.matchAll(QUOTED)].map((m) => m[1]);
		expect(names).toEqual(VARIANTS.map((v) => v.name));
	});

	it("sets every required variable in every variant, heavy-wash and heavy-ink included", () => {
		const palettes = buildPalettes();
		expect(Object.keys(palettes)).toHaveLength(22);
		for (const [name, palette] of Object.entries(palettes)) {
			expect(Object.keys(palette).sort(), name).toEqual([...REQUIRED].sort());
			expect(palette["heavy-wash"], name).toMatch(HEX);
			expect(palette["heavy-ink"], name).toMatch(HEX);
		}
	});

	it("keeps the Default backgrounds the launch cover is drawn on", () => {
		const palettes = buildPalettes();
		expect(palettes.light.background).toBe("#f7f5fb");
		expect(palettes.dark.background).toBe("#0e0c15");
	});

	it("stops on a missing or undeclared variable", () => {
		expect(() => buildVariant("x", "light", {})).toThrow("derive needs");
		const own = buildPalettes().light;
		expect(() => buildVariant("x", "light", { ...own, bogus: "red" })).toThrow(
			"unknown --bogus"
		);
	});

	it("sets every variable HeroUI Native's own themes set", () => {
		// Its per-theme variables live in @layer theme; the ones above it are global.
		const css = readFileSync(join(heroStyles, "variables.css"), "utf8");
		const themed = css.slice(css.indexOf("@layer theme"));
		const theirs = [...declared(themed)].map((v) => v.slice(2));
		const ours = new Set<string>(HEROUI);
		expect(theirs.filter((v) => !ours.has(v))).toEqual([]);
	});
});
