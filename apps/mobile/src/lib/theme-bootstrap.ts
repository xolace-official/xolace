/** Applies the persisted theme to Uniwind before React renders; storage is synchronous so
 * `getState()` is hydrated. Mirrors use-appearance-settings.ts. */
import { Appearance } from "react-native";
import { Uniwind } from "uniwind";
import { useAppStore } from "@/store/store";

const { theme, colorThemeId } = useAppStore.getState();

if (colorThemeId === "default" && theme === "system") {
	Uniwind.setTheme("system" as never);
} else {
	const mode =
		theme === "system"
			? Appearance.getColorScheme() === "dark"
				? "dark"
				: "light"
			: theme;
	const variant = colorThemeId === "default" ? mode : `${colorThemeId}-${mode}`;
	Uniwind.setTheme(variant as never);
}
