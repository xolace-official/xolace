import { describe, expect, it } from "vitest";
import type { ThemeEntry } from "@/src/lib/themes";
import { getInitialThemeCarouselIndex } from "./get-initial-theme-carousel-index";

const THEME_STUBS: ThemeEntry[] = [
	"default",
	"quiet",
	"reverie",
	"emerald",
	"noir",
].map((id) => ({
	id,
	name: id,
	preview: {
		accent: "#000",
		bg: "#000",
		border: "#000",
		fg: "#fff",
		surface: "#000",
	},
	tier: id === "emerald" || id === "noir" ? "premium" : "free",
	variants: { dark: `${id}-dark`, light: `${id}-light` },
}));

describe("getInitialThemeCarouselIndex", () => {
	it("centers on the active free theme", () => {
		expect(getInitialThemeCarouselIndex(THEME_STUBS, "reverie")).toBe(2);
	});

	it("falls back to the first card for an unknown/stale id", () => {
		expect(getInitialThemeCarouselIndex(THEME_STUBS, "ghost-theme")).toBe(0);
	});
});
