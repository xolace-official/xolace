/** Applies the persisted theme to Uniwind before React renders; storage is synchronous so
 * `getState()` is hydrated. Settings › Appearance (`features/settings/appearance/use-appearance.ts`)
 * applies a change while the app runs. Native appearance waits for the launch cover. */
// First: it holds back native appearance until the launch cover leaves, and reads the phone's
// scheme before anything forces one.
import "@/lib/native-appearance";
import { Appearance } from "react-native";
import { themeVariant } from "@/design/themes";
import { applyTheme } from "@/lib/native-appearance";
import { useAppStore } from "@/store/store";

const { theme, colorThemeId } = useAppStore.getState();

if (colorThemeId === "default" && theme === "system") {
	applyTheme("system");
} else {
	const mode =
		theme === "system"
			? Appearance.getColorScheme() === "dark"
				? "dark"
				: "light"
			: theme;
	applyTheme(themeVariant(colorThemeId, mode));
}
