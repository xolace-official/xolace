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
