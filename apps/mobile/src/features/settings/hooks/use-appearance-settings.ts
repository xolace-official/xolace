import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Uniwind } from "uniwind";
import { useAppTheme } from "@/context/app-theme-context";
import { findVariant, isPremiumTheme, themeVariant } from "@/design/themes";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useAccessibilityInfo } from "@/helpers/hooks/use-accessability-info";
import {
	isReducedMotion,
	type MotionPreference,
	resolveMotionPreference,
} from "@/lib/motion/use-effective-reduced-motion";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";
import { useAppStore } from "@/store/store";

export type ThemeMode = "system" | "light" | "dark";

export const useAppearanceSettings = () => {
	const preferences = useQuery(api.preferences.get);
	const updatePreferences = usePreferenceMutation();
	const {
		theme: storedTheme,
		setTheme: storeSetTheme,
		colorThemeId,
		setColorThemeId,
	} = useAppStore();
	const { currentTheme, isLight } = useAppTheme();
	const { isPlus } = usePlusEntitlement();
	const nightModeEnabled = useAppStore((s) => s.nightModeEnabled);
	const setNightModeEnabled = useAppStore((s) => s.setNightModeEnabled);

	const { reduceMotionEnabled: osReduceMotion } = useAccessibilityInfo();
	const motionPreference = resolveMotionPreference(
		preferences?.motionPreference,
		preferences?.reducedMotion
	);
	// What the app will actually do given the current pref + phone setting.
	const effectiveReducedMotion = isReducedMotion(
		motionPreference,
		osReduceMotion
	);

	const themeDisplay =
		storedTheme === "system"
			? "System"
			: storedTheme === "light"
				? "Light"
				: "Dark";

	const setThemeMode = (mode: ThemeMode) => {
		if (mode === "system") {
			Uniwind.setTheme("system" as never);
			storeSetTheme("system");
			updatePreferences({ theme: "system" });
			return;
		}
		const themeId = findVariant(currentTheme)?.themeId ?? "default";
		Uniwind.setTheme(themeVariant(themeId, mode));
		storeSetTheme(mode);
		updatePreferences({ theme: mode });
	};

	const setMotionPreference = (v: MotionPreference) => {
		updatePreferences({ motionPreference: v });
	};

	const setColorTheme = (themeId: string) => {
		// Premium themes need an active Xolace+ entitlement; the picker gates
		// the tap, this guards any other caller.
		if (isPremiumTheme(themeId) && !isPlus) {
			return;
		}
		const mode =
			storedTheme === "system" ? (isLight ? "light" : "dark") : storedTheme;
		Uniwind.setTheme(themeVariant(themeId, mode));
		setColorThemeId(themeId);
		updatePreferences({ colorTheme: themeId });
	};

	return {
		colorThemeId,
		effectiveReducedMotion,
		motionPreference,
		nightModeEnabled,
		osReduceMotion,
		setColorTheme,
		setMotionPreference,
		setNightModeEnabled,
		setThemeMode,
		storedTheme,
		themeDisplay,
	};
};
