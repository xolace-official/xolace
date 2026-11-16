import { useUniwind } from "uniwind";
import { findVariant, type ThemeMode } from "./themes";

/**
 * Light or dark for the theme in effect here; inside a `ScopedTheme`, the scoped
 * theme's. Native views (SwiftUI, Compose) follow the system scheme, which a
 * ScopedTheme doesn't change, so they need it said out loud (`ThemedHost`).
 */
export function useScheme(): ThemeMode {
	const { theme } = useUniwind();
	return findVariant(theme)?.base ?? "light";
}
