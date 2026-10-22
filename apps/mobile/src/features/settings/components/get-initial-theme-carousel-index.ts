import type { ThemeEntry } from "@/src/lib/themes";

/**
 * Which index the theme carousel should center on at mount, given the
 * combined ordered theme list and the currently active theme id.
 * Falls back to the first card if the id isn't found (e.g. a stale
 * persisted id for a theme that no longer exists).
 */
export function getInitialThemeCarouselIndex(
  themes: ThemeEntry[],
  activeThemeId: string,
): number {
  const index = themes.findIndex((t) => t.id === activeThemeId);
  return index === -1 ? 0 : index;
}
