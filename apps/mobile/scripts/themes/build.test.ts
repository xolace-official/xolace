import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const DECLARED = /(--[a-z0-9-]+)\s*:/g;
const SOURCE_FILE = /\.tsx?$/;
const UNIWIND_THEMES = /themes: readonly \[([^\]]*)\]/;
const QUOTED = /'([^']+)'/g;
const HEX = /^#/;
const COLOR_LITERAL = /["'`](--color-[a-z0-9-]*[a-z0-9])["'`]/g;
const declared = (css: string) =>
	new Set([...css.matchAll(DECLARED)].map((m) => m[1]));

const heroStyles = join(
	dirname(createRequire(import.meta.url).resolve("heroui-native/package.json")),
	"src/styles"
);

/** Class-name tokens the hand-written global.css declared; old screens still use them. */
const PRODUCTION_COLOR_TOKENS = [
	"archive-tint-1",
	"archive-tint-2",
	"archive-tint-3",
	"archive-tint-4",
	"browse-audio",
	"browse-audio-foreground",
	"browse-music",
	"browse-music-foreground",
	"browse-topics",
	"browse-topics-foreground",
	"cover-ink",
	"cover-scrim",
	"ember",
	"event",
	"event-foreground",
	"face-blush",
	"face-brow",
	"face-highlight",
	"face-highlight-clear",
	"face-pupil",
	"face-sclera",
	"frost",
	"frost-text",
	"offer-ink",
	"player-ink",
	"player-scrim",
	"plus-night",
	"poster-chip",
	"poster-deck",
	"poster-field",
	"poster-hairline",
	"poster-ink",
	"poster-ink-deep",
	"poster-ink-faint",
	"poster-ink-soft",
	"poster-paper",
	"poster-plate",
	"poster-resonate",
	"poster-send",
	"poster-shadow",
	"reader-night-bg",
	"reader-night-ink",
	"reader-night-muted",
	"reader-paper-bg",
	"reader-paper-ink",
	"reader-paper-muted",
	"resonance",
	"resonance-foreground",
	"tone-direct",
	"tone-direct-text",
	"tone-gentle",
	"tone-gentle-text",
	"tone-poetic",
	"tone-poetic-text",
	"tone-witnessed",
	"tone-witnessed-text",
	...["ash", "sage", "vesper", "wren"].flatMap((v) =>
		["light", "mid", "deep"].map((s) => `orb-${v}-${s}`)
	),
	"orb-base",
	"orb-rim",
	"orb-sheen",
	"orb-sheen-clear",
];

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			return name === "sample-codes" ? [] : sourceFiles(path);
		}
		return SOURCE_FILE.test(name) ? [path] : [];
	});
}

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

describe("token names old screens use", () => {
	const tokens = new Set([
		...declared(read("src/global.css")),
		...declared(readFileSync(join(heroStyles, "theme.css"), "utf8")),
		...REQUIRED.map((v) => `--${v}`),
	]);

	it("keeps every class-name token the hand-written CSS declared", () => {
		const lost = PRODUCTION_COLOR_TOKENS.filter(
			(t) => !tokens.has(`--color-${t}`)
		);
		expect(lost).toEqual([]);
	});

	it("declares every --color-* name the source reads by string", () => {
		// The heatmap's default ramp token predates the generator and is always overridden.
		const known = new Set(["--color-chart-1", "--color-chart-3"]);
		const missing = new Set<string>();
		for (const file of sourceFiles(join(root, "src"))) {
			for (const [, name] of readFileSync(file, "utf8").matchAll(
				COLOR_LITERAL
			)) {
				if (!(tokens.has(name) || known.has(name))) {
					missing.add(name);
				}
			}
		}
		expect([...missing]).toEqual([]);
	});
});
