import { describe, expect, it } from "vitest";
import { getInitialThemeCarouselIndex } from "./get-initial-theme-carousel-index";

const THEME_STUBS = ["default", "quiet", "reverie", "emerald", "noir"].map(
	(id) => ({ id })
);

describe("getInitialThemeCarouselIndex", () => {
	it("centers on the active free theme", () => {
		expect(getInitialThemeCarouselIndex(THEME_STUBS, "reverie")).toBe(2);
	});

	it("falls back to the first card for an unknown/stale id", () => {
		expect(getInitialThemeCarouselIndex(THEME_STUBS, "ghost-theme")).toBe(0);
	});
});
