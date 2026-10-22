import { useQuery } from "convex/react";
import { Uniwind } from "uniwind";
import { api } from "@/convex/_generated/api";
import { useAppStore } from "@/src/store/store";
import { useAppTheme } from "@/src/context/app-theme-context";
import { usePreferenceMutation } from "./use-preference-mutation";
import { usePlusEntitlement } from "@/src/features/purchases/use-plus-entitlement";
import { THEME_BY_ID } from "@/src/lib/themes";
import { useAccessibilityInfo } from "@/src/helpers/hooks/use-accessability-info";
import {
  resolveMotionPreference,
  isReducedMotion,
  type MotionPreference,
} from "@/src/lib/motion/use-effective-reduced-motion";

export type ThemeMode = "system" | "light" | "dark";

export const useAppearanceSettings = () => {
  const preferences = useQuery(api.preferences.get);
  const updatePreferences = usePreferenceMutation();
  const { theme: storedTheme, setTheme: storeSetTheme, colorThemeId, setColorThemeId } = useAppStore();
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
  const effectiveReducedMotion = isReducedMotion(motionPreference, osReduceMotion);

  const themeDisplay =
    storedTheme === "system" ? "System" : storedTheme === "light" ? "Light" : "Dark";

  const setThemeMode = (mode: ThemeMode) => {
    if (mode === "system") {
      Uniwind.setTheme("system" as never);
      storeSetTheme("system");
      updatePreferences({ theme: "system" });
      return;
    }
    const stripped = currentTheme.replace(/-light$/, "").replace(/-dark$/, "");
    const isBaseOnly = stripped === "light" || stripped === "dark";
    const nextTheme = isBaseOnly ? mode : (`${stripped}-${mode}` as never);
    Uniwind.setTheme(nextTheme);
    storeSetTheme(mode);
    updatePreferences({ theme: mode });
  };

  const setMotionPreference = (v: MotionPreference) => {
    updatePreferences({ motionPreference: v });
  };

  const setColorTheme = (themeId: string) => {
    // Premium themes need an active Xolace+ entitlement (and shipped CSS) —
    // the picker gates the tap, this guards any other caller.
    const entry = THEME_BY_ID[themeId];
    if (entry?.tier === "premium" && (!isPlus || entry.available === false)) return;
    const mode = storedTheme === "system" ? (isLight ? "light" : "dark") : storedTheme;
    const nextVariant = themeId === "default" ? mode : (`${themeId}-${mode}` as never);
    Uniwind.setTheme(nextVariant);
    setColorThemeId(themeId);
    updatePreferences({ colorTheme: themeId });
  };

  return {
    themeDisplay,
    storedTheme,
    setThemeMode,
    colorThemeId,
    setColorTheme,
    motionPreference,
    setMotionPreference,
    osReduceMotion,
    effectiveReducedMotion,
    nightModeEnabled,
    setNightModeEnabled,
  };
};
