import { describe, expect, it } from "vitest";
import type { ThemeEntry } from "@/src/lib/themes";
import { getInitialThemeCarouselIndex } from "./get-initial-theme-carousel-index";

const STUB_VARIANTS: Pick<ThemeEntry, "id" | "variants">[] = [
	{ id: "default", variants: { dark: "dark", light: "light" } },
	{ id: "quiet", variants: { dark: "quiet-dark", light: "quiet-light" } },
	{ id: "reverie", variants: { dark: "reverie-dark", light: "reverie-light" } },
	{ id: "emerald", variants: { dark: "emerald-dark", light: "emerald-light" } },
	{ id: "noir", variants: { dark: "noir-dark", light: "noir-light" } },
];

const THEME_STUBS: ThemeEntry[] = STUB_VARIANTS.map(({ id, variants }) => ({
	id,
	name: id,
	tier: id === "emerald" || id === "noir" ? "premium" : "free",
	variants,
}));

describe("getInitialThemeCarouselIndex", () => {
	it("centers on the active free theme", () => {
		expect(getInitialThemeCarouselIndex(THEME_STUBS, "reverie")).toBe(2);
	});

	it("falls back to the first card for an unknown/stale id", () => {
		expect(getInitialThemeCarouselIndex(THEME_STUBS, "ghost-theme")).toBe(0);
	});
});
