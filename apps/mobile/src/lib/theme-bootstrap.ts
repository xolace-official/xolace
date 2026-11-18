/** Applies the persisted theme to Uniwind before React renders; storage is synchronous so
 * `getState()` is hydrated. Settings › Appearance (`features/settings/appearance/use-appearance.ts`)
 * applies a change while the app runs. Native appearance waits for the launch cover. */
// First: it holds back native appearance (Uniwind.setTheme forces it for Default's light and
// dark) until the launch cover leaves, and reads the phone's scheme before anything forces one.
import "@/lib/native-appearance";
import { Appearance } from "react-native";
import { Uniwind } from "uniwind";
import { themeVariant } from "@/design/themes";
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
	Uniwind.setTheme(themeVariant(colorThemeId, mode));
}
