import { describe, expect, it } from "vitest";
import { getInitialThemeCarouselIndex } from "./get-initial-theme-carousel-index";
import type { ThemeEntry } from "@/src/lib/themes";

const THEME_STUBS: ThemeEntry[] = ["default", "quiet", "reverie", "emerald", "noir"].map(
  (id) => ({
    id,
    name: id,
    tier: id === "emerald" || id === "noir" ? "premium" : "free",
    variants: { light: `${id}-light`, dark: `${id}-dark` },
    preview: { bg: "#000", fg: "#fff", accent: "#000", surface: "#000", border: "#000" },
  }),
);

describe("getInitialThemeCarouselIndex", () => {
  it("centers on the active free theme", () => {
    expect(getInitialThemeCarouselIndex(THEME_STUBS, "reverie")).toBe(2);
  });

  it("falls back to the first card for an unknown/stale id", () => {
    expect(getInitialThemeCarouselIndex(THEME_STUBS, "ghost-theme")).toBe(0);
  });
});
