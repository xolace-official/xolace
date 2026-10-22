import { Platform } from "react-native";
import type { NativeStackNavigationOptions } from "expo-router";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useThemeColor } from "heroui-native";
import { useAppTheme } from "@/src/context/app-theme-context";

/**
 * Return navigation options for a styled header.
 * iOS: large transparent header with blur/glass effect.
 * Android: standard header with themed background color.
 */
export function useLargeHeaderOptions(): NativeStackNavigationOptions {
  const headerTintColor = useThemeColor("foreground");
  const backgroundColor = useThemeColor("background");
  const { isDark } = useAppTheme();

  if (Platform.OS === "android") {
    return {
      headerTintColor,
      headerStyle: { backgroundColor },
      headerShadowVisible: false,
      contentStyle: { backgroundColor },
    };
  }

  const isGlassAvailable = isLiquidGlassAvailable();

  return {
    headerTintColor,
    // Opaque, not transparent: on iOS 18 (no liquid glass) react-native-screens
    // honours a transparent contentStyle literally, so the outgoing screen
    // bleeds through the pushed one for the whole transition — it reads as a
    // laggy/ghosted push on an iPhone XR. iOS 26 paints it opaque regardless.
    contentStyle: { backgroundColor },
    headerTransparent: true,
    headerBlurEffect: !isGlassAvailable
      ? isDark
        ? "dark"
        : "light"
      : undefined,
    // iOS 26: content fades softly under the glass header. Never alongside
    // headerBlurEffect — the two overlap. Needs the scroll view to be the
    // screen's first descendant to find it.
    scrollEdgeEffects: isGlassAvailable ? { top: "soft" } : undefined,
    headerLargeStyle: {
      backgroundColor: "transparent",
    },
    headerTitleStyle: {
      color: headerTintColor,
    },
    headerLargeTitleStyle: {
      color: headerTintColor,
    },
    headerLargeTitle: true,
    // Chevron only — matches the icon-only toolbar back on each stack root.
    headerBackButtonDisplayMode: "minimal",
  };
}
