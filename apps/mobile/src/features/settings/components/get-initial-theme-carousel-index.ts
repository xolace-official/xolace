import type { ThemeEntry } from "@/design/themes";

/** Index the theme carousel centers on at mount; the first card when the active
 * id is not in the list (a stale persisted id). */
export function getInitialThemeCarouselIndex(
	themes: readonly Pick<ThemeEntry, "id">[],
	activeThemeId: string
): number {
	const index = themes.findIndex((t) => t.id === activeThemeId);
	return index === -1 ? 0 : index;
}
