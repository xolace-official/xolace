import { useUniwind } from "uniwind";
import { findVariant, type ThemeMode } from "./themes";

export function useScheme(): ThemeMode {
	const { theme } = useUniwind();
	return findVariant(theme)?.base ?? "light";
}
