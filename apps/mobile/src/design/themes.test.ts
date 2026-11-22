import { describe, expect, it } from "vitest";
import {
	FREE_THEMES,
	findVariant,
	NIGHT_VARIANT,
	oppositeVariant,
	PREMIUM_THEMES,
	THEMES,
	themeVariant,
	VARIANTS,
} from "./themes";

const SAVED_THEME_IDS = [
	"default",
	"quiet",
	"reverie",
	"human",
	"nightly",
	"emerald",
	"rose",
	"platinum",
	"velvet",
	"noir",
	"playful",
];

const SAVED_VARIANTS = [
	"light",
	"dark",
	...SAVED_THEME_IDS.filter((id) => id !== "default").flatMap((id) => [
		`${id}-light`,
		`${id}-dark`,
	]),
];

describe("theme registry", () => {
	it("has the redesign's 21 variants plus nightly-light", () => {
		expect(VARIANTS).toHaveLength(22);
		expect(VARIANTS.map((v) => v.name)).toContain("nightly-light");
	});

	it("still draws every theme name production users may have saved", () => {
		for (const name of SAVED_VARIANTS) {
			expect(findVariant(name)?.name, name).toBe(name);
		}
	});

	it("resolves every saved theme id in both modes to its own variant", () => {
		for (const id of SAVED_THEME_IDS) {
			for (const mode of ["light", "dark"] as const) {
				const expected = id === "default" ? mode : `${id}-${mode}`;
				expect(themeVariant(id, mode)).toBe(expected);
			}
		}
	});

	it("falls back to Default for an id this build doesn't know", () => {
		expect(themeVariant("ghost", "dark")).toBe("dark");
		expect(themeVariant("ghost", "light")).toBe("light");
	});

	it("reads a variant's mode from the registry, not its suffix", () => {
		expect(findVariant("velvet-dark")).toEqual({
			base: "dark",
			name: "velvet-dark",
			themeId: "velvet",
		});
		expect(findVariant("system")).toBeUndefined();
		expect(findVariant(null)).toBeUndefined();
	});

	it("toggles every variant to its other mode and back", () => {
		for (const { name, base } of VARIANTS) {
			const other = oppositeVariant(name);
			expect(findVariant(other)?.base, name).not.toBe(base);
			expect(oppositeVariant(other)).toBe(name);
		}
	});

	it("puts night mode on nightly-dark", () => {
		expect(NIGHT_VARIANT).toBe("nightly-dark");
	});

	it("offers four free and six Plus themes, and hides Night", () => {
		expect(FREE_THEMES.map((t) => t.id)).toEqual([
			"default",
			"quiet",
			"reverie",
			"human",
		]);
		expect(PREMIUM_THEMES.map((t) => t.id)).toEqual([
			"emerald",
			"rose",
			"platinum",
			"velvet",
			"noir",
			"playful",
		]);
		expect(THEMES.find((t) => t.id === "nightly")?.hiddenFromPicker).toBe(true);
	});
});
